'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';

type Settings = {
  hasOpenai: boolean;
  hasMollie: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpFrom: string;
  hasSmtpPass: boolean;
};

type Intake = {
  id: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  email: string;
  gender: string;
  ageGroup: string;
  heightCm: number | null;
  paymentStatus: string;
  emailSent: boolean;
};

export default function AdminModelAnalysePage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [rows, setRows] = useState<Intake[]>([]);
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState({ openaiKey: '', mollieKey: '', smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '', smtpFrom: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/model-intake?admin=1', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || 'Laden mislukt');
    setSettings(data.settings);
    setRows(data.intakes || []);
    setForm((prev) => ({
      ...prev,
      smtpHost: data.settings?.smtpHost || '',
      smtpPort: String(data.settings?.smtpPort || 587),
      smtpUser: data.settings?.smtpUser || '',
      smtpFrom: data.settings?.smtpFrom || '',
    }));
  }, [token]);

  useEffect(() => {
    load().catch((error: Error) => setErr(error.message));
  }, [load]);

  useEffect(() => {
    if (!token || !rows.length) return;
    let stop = false;
    void (async () => {
      const next: Record<string, string[]> = {};
      for (const row of rows.slice(0, 30)) {
        const urls: string[] = [];
        for (const slot of ['full', 'face', 'side']) {
          const res = await fetch(`/api/model-intake?photo=${row.id}&slot=${slot}`, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) continue;
          const blob = await res.blob();
          urls.push(URL.createObjectURL(blob));
        }
        next[row.id] = urls;
        if (stop) return;
      }
      if (!stop) setPhotos(next);
    })();
    return () => {
      stop = true;
    };
  }, [token, rows]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setErr('Je bent niet ingelogd.');
      return;
    }
    setMsg('');
    setErr('');
    try {
      const res = await fetch('/api/model-intake', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'settings', ...form, smtpPort: Number(form.smtpPort) || 587 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.message || data.error || 'Opslaan mislukt');
        return;
      }
      setForm((prev) => ({ ...prev, openaiKey: '', mollieKey: '', smtpPass: '' }));
      setMsg('Bewaard.');
      await load();
    } catch {
      setErr('Opslaan mislukt.');
    }
  }

  return (
    <div className="space-y-6 p-4 text-sm">
      <h1 className="text-xl font-semibold">Modelanalyse</h1>
      <form onSubmit={save} className="space-y-3 rounded-md border border-line bg-white p-4 shadow-sm">
        <label className="block">
          <span className="text-xs text-muted">OpenAI-sleutel {settings?.hasOpenai ? '(ingesteld — leeg laten om te behouden)' : ''}</span>
          <input className="mt-1 w-full border border-line px-2 py-2" type="password" autoComplete="off" value={form.openaiKey} onChange={(e) => setForm({ ...form, openaiKey: e.target.value })} />
        </label>
        <button className="border border-line bg-zinc-900 px-4 py-2 text-white" type="submit">Bewaren</button>
        {msg ? <p>{msg}</p> : null}
        {err ? <p className="text-red-700">{err}</p> : null}
        <label className="block">
          <span className="text-xs text-muted">Mollie-sleutel voor € 3,99 {settings?.hasMollie ? '(ingesteld — leeg laten om te behouden)' : ''}</span>
          <input className="mt-1 w-full border border-line px-2 py-2" type="password" autoComplete="off" value={form.mollieKey} onChange={(e) => setForm({ ...form, mollieKey: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-xs text-muted">SMTP-host</span>
          <input className="mt-1 w-full border border-line px-2 py-2" value={form.smtpHost} onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-xs text-muted">SMTP-poort</span>
          <input className="mt-1 w-full border border-line px-2 py-2" value={form.smtpPort} onChange={(e) => setForm({ ...form, smtpPort: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-xs text-muted">SMTP-gebruiker</span>
          <input className="mt-1 w-full border border-line px-2 py-2" value={form.smtpUser} onChange={(e) => setForm({ ...form, smtpUser: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-xs text-muted">SMTP-wachtwoord {settings?.hasSmtpPass ? '(ingesteld — leeg laten om te behouden)' : ''}</span>
          <input className="mt-1 w-full border border-line px-2 py-2" type="password" autoComplete="off" value={form.smtpPass} onChange={(e) => setForm({ ...form, smtpPass: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Afzender</span>
          <input className="mt-1 w-full border border-line px-2 py-2" value={form.smtpFrom} onChange={(e) => setForm({ ...form, smtpFrom: e.target.value })} />
        </label>
        <button className="border border-line bg-zinc-900 px-4 py-2 text-white" type="submit">Bewaren</button>
        {msg ? <p>{msg}</p> : null}
        {err ? <p className="text-red-700">{err}</p> : null}
      </form>
      <div className="space-y-3">
        {rows.map((row) => (
          <article key={row.id} className="rounded-md border border-line bg-white p-4">
            <p><strong>{row.firstName} {row.lastName}</strong> · {row.email}</p>
            <p className="text-xs text-muted">{new Date(row.createdAt).toLocaleString('nl-BE')} · {row.paymentStatus} · mail {row.emailSent ? 'verstuurd' : 'niet verstuurd'} · {row.heightCm ?? '—'} cm</p>
            <div className="mt-2 flex gap-2">
              {(photos[row.id] || []).map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" className="h-24 w-16 object-cover" />
              ))}
            </div>
          </article>
        ))}
        {!rows.length ? <p className="text-muted">Nog geen analyses.</p> : null}
      </div>
    </div>
  );
}
