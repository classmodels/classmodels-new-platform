'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';

const FILLED = '••••••••••••';

type Balance = { available: string; pending: string; currency: string };

type Settings = {
  hasOpenai: boolean;
  hasMollie: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpFrom: string;
  hasSmtpPass: boolean;
  mollieBalance: Balance | null;
  mollieBalanceError: string;
};

function euro(value: string, currency = 'EUR') {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency }).format(amount);
}

function Status({ on, label }: { on: boolean; label: string }) {
  return (
    <p className="flex items-center justify-between gap-3 rounded border border-line bg-panel px-3 py-2">
      <span>{label}</span>
      <strong className={on ? 'text-emerald-700' : 'text-zinc-500'}>{on ? 'Actief' : 'Niet ingesteld'}</strong>
    </p>
  );
}

export default function AdminModelAnalysePage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState({ openaiKey: '', mollieKey: '', smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '', smtpFrom: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/model-intake?admin=1', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || 'Laden mislukt');
    setSettings(data.settings);
    setForm((prev) => ({
      ...prev,
      openaiKey: data.settings?.hasOpenai ? FILLED : '',
      mollieKey: data.settings?.hasMollie ? FILLED : '',
      smtpPass: data.settings?.hasSmtpPass ? FILLED : '',
      smtpHost: data.settings?.smtpHost || '',
      smtpPort: String(data.settings?.smtpPort || 587),
      smtpUser: data.settings?.smtpUser || '',
      smtpFrom: data.settings?.smtpFrom || '',
    }));
  }, [token]);

  useEffect(() => {
    load().catch((error: Error) => setErr(error.message));
  }, [load]);

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
        body: JSON.stringify({
          action: 'settings',
          ...form,
          openaiKey: form.openaiKey === FILLED ? '' : form.openaiKey,
          mollieKey: form.mollieKey === FILLED ? '' : form.mollieKey,
          smtpPass: form.smtpPass === FILLED ? '' : form.smtpPass,
          smtpPort: Number(form.smtpPort) || 587,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.message || data.error || 'Opslaan mislukt');
        return;
      }
      setForm((prev) => ({
        ...prev,
        openaiKey: settings?.hasOpenai ? FILLED : '',
        mollieKey: settings?.hasMollie ? FILLED : '',
        smtpPass: settings?.hasSmtpPass ? FILLED : '',
      }));
      setMsg('Bewaard.');
      await load();
    } catch {
      setErr('Opslaan mislukt.');
    }
  }

  const balance = settings?.mollieBalance;

  return (
    <form onSubmit={save} className="space-y-3 rounded-md border border-line bg-white p-4 text-sm shadow-sm">
        <Status on={Boolean(settings?.hasOpenai)} label="OpenAI-sleutel" />
        <label className="block">
          <span className="text-xs text-muted">OpenAI-sleutel</span>
          <input className="mt-1 w-full border border-line px-2 py-2 tracking-[0.3em]" type="password" autoComplete="off" value={form.openaiKey} onChange={(e) => setForm({ ...form, openaiKey: e.target.value })} />
        </label>
        <Status on={Boolean(settings?.hasMollie)} label="Mollie-sleutel" />
        {settings?.hasMollie && balance ? (
          <p className="rounded border border-line bg-panel px-3 py-2">
            Beschikbaar op Mollie: <strong>{euro(balance.available, balance.currency)}</strong>
            <span className="mt-1 block text-xs text-muted">In afwachting: {euro(balance.pending, balance.currency)}</span>
          </p>
        ) : null}
        {settings?.hasMollie && !balance && settings.mollieBalanceError ? (
          <p className="text-xs text-muted">{settings.mollieBalanceError}</p>
        ) : null}
        <label className="block">
          <span className="text-xs text-muted">Mollie-sleutel</span>
          <input className="mt-1 w-full border border-line px-2 py-2 tracking-[0.3em]" type="password" autoComplete="off" value={form.mollieKey} onChange={(e) => setForm({ ...form, mollieKey: e.target.value })} />
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
        <Status on={Boolean(settings?.hasSmtpPass)} label="SMTP-wachtwoord" />
        <label className="block">
          <span className="text-xs text-muted">SMTP-wachtwoord</span>
          <input className="mt-1 w-full border border-line px-2 py-2 tracking-[0.3em]" type="password" autoComplete="off" value={form.smtpPass} onChange={(e) => setForm({ ...form, smtpPass: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Afzender</span>
          <input className="mt-1 w-full border border-line px-2 py-2" value={form.smtpFrom} onChange={(e) => setForm({ ...form, smtpFrom: e.target.value })} />
        </label>
        <button className="border border-line bg-zinc-900 px-4 py-2 text-white" type="submit">Bewaren</button>
        {msg ? <p>{msg}</p> : null}
        {err ? <p className="text-red-700">{err}</p> : null}
    </form>
  );
}
