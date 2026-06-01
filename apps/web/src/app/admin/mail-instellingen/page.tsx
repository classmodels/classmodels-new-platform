'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type SmtpRow = {
  smtpHost: string | null;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpPassIsSet: boolean;
  mailFrom: string | null;
  updatedAt: string;
  effectiveHost: string | null;
  effectiveSource: 'database' | 'env' | 'database+env' | null;
  envSmtpHostConfigured: boolean;
  smtpMisconfigured?: boolean;
};

export default function AdminMailInstellingenPage() {
  const { token, can } = useAuth();
  const [data, setData] = useState<SmtpRow | null>(null);
  const [form, setForm] = useState({
    smtpHost: '',
    smtpPort: '587',
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    mailFrom: '',
  });
  const [testTo, setTestTo] = useState('');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [testErr, setTestErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const d = await adminFetch<SmtpRow>('/admin/site-smtp-settings', token);
    setData(d);
    setForm({
      smtpHost: d.smtpHost ?? '',
      smtpPort: String(d.smtpPort || 587),
      smtpSecure: d.smtpSecure,
      smtpUser: d.smtpUser ?? '',
      smtpPass: '',
      mailFrom: d.mailFrom ?? '',
    });
  }, [token]);

  useEffect(() => {
    load().catch(() => setData(null));
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaveMsg(null);
    setSaveErr(null);
    setBusy(true);
    try {
      const port = parseInt(form.smtpPort, 10);
      await adminFetch('/admin/site-smtp-settings', token, {
        method: 'PATCH',
        body: JSON.stringify({
          smtpHost: form.smtpHost.trim() || null,
          smtpPort: Number.isFinite(port) && port > 0 ? port : null,
          smtpSecure: form.smtpSecure,
          smtpUser: form.smtpUser.trim() || null,
          ...(form.smtpPass.trim() ? { smtpPass: form.smtpPass } : {}),
          mailFrom: form.mailFrom.trim() || null,
        }),
      });
      setSaveMsg('Opgeslagen. Herstart de API niet nodig — volgende mail gebruikt deze waarden.');
      await load();
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Opslaan mislukt');
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    if (!token) return;
    setTestMsg(null);
    setTestErr(null);
    setBusy(true);
    try {
      const res = await adminFetch<{ ok: boolean; message?: string; error?: string }>(
        '/admin/site-smtp-settings/test',
        token,
        {
          method: 'POST',
          body: JSON.stringify({ to: testTo.trim() }),
        },
      );
      if (res.ok) setTestMsg(res.message ?? 'Verzonden.');
      else setTestErr(res.error ?? 'Mislukt');
    } catch (err) {
      setTestErr(err instanceof Error ? err.message : 'Test mislukt');
    } finally {
      setBusy(false);
    }
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;
  if (!can('admin.agenda.read')) {
    return <p className="text-sm text-muted">Je hebt geen rechten (admin.agenda.read).</p>;
  }

  const canWrite = can('admin.agenda.write');

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">E-mail (SMTP)</h1>
        <p className="mt-2 text-sm text-muted">
          Vul hier de gegevens van je <strong>Combell mail hosting</strong> (of andere SMTP). Zolang <strong>SMTP-host</strong>{' '}
          hier staat, wint dit boven lege waarden in de server-.env. Voor Combell gebruik je meestal{' '}
          <code className="rounded bg-zinc-100 px-1 text-xs">smtp.mailprotect.be</code> poort{' '}
          <code className="rounded bg-zinc-100 px-1 text-xs">587</code> met je mailbox als gebruikersnaam en het
          mailbox-wachtwoord.
        </p>
      </div>

      {data ? (
        <div className="rounded-md border border-line bg-zinc-50 p-4 text-sm space-y-2">
          <p>
            <span className="font-medium text-ink">Actieve SMTP-host:</span>{' '}
            <code className="text-xs">{data.effectiveHost ?? '(geen — geen mails)'}</code>
            {data.effectiveSource ? (
              <span className="ml-2 text-xs text-muted">
                (
                {data.effectiveSource === 'database'
                  ? 'database'
                  : data.effectiveSource === 'database+env'
                    ? 'database + .env'
                    : 'omgeving'}
                )
              </span>
            ) : null}
          </p>
          {data.smtpMisconfigured ? (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
              SMTP-gebruiker staat ingesteld maar het wachtwoord ontbreekt. Mails worden niet verstuurd tot u het
              wachtwoord hier invult of <code className="px-1">SMTP_PASS</code> in de server-.env zet.
            </p>
          ) : null}
          {!data.effectiveHost ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Geen SMTP geconfigureerd — agenda-bevestigingsmails worden niet verstuurd. Vul hieronder in of zet{' '}
              <code className="px-1">SMTP_HOST</code> op de server.
            </p>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={save} className="space-y-4 rounded-md border border-line bg-white p-4 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-zinc-700">SMTP-host</label>
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            value={form.smtpHost}
            onChange={(e) => setForm((f) => ({ ...f, smtpHost: e.target.value }))}
            placeholder="smtp.mailprotect.be"
            disabled={!canWrite || busy}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700">Poort</label>
            <input
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              value={form.smtpPort}
              onChange={(e) => setForm((f) => ({ ...f, smtpPort: e.target.value }))}
              disabled={!canWrite || busy}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 pt-6 text-sm">
            <input
              type="checkbox"
              checked={form.smtpSecure}
              onChange={(e) => setForm((f) => ({ ...f, smtpSecure: e.target.checked }))}
              disabled={!canWrite || busy}
            />
            SSL/TLS (secure) — meestal uit bij poort 587
          </label>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700">Gebruikersnaam (volledig e-mailadres mailbox)</label>
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            value={form.smtpUser}
            onChange={(e) => setForm((f) => ({ ...f, smtpUser: e.target.value }))}
            placeholder="info@jouwdomein.be"
            disabled={!canWrite || busy}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700">Wachtwoord</label>
          <input
            type="password"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            value={form.smtpPass}
            onChange={(e) => setForm((f) => ({ ...f, smtpPass: e.target.value }))}
            placeholder={data?.smtpPassIsSet ? '•••• laat leeg om niet te wijzigen' : 'Mailbox-wachtwoord'}
            autoComplete="new-password"
            disabled={!canWrite || busy}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700">From (zichtbaar voor ontvangers)</label>
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            value={form.mailFrom}
            onChange={(e) => setForm((f) => ({ ...f, mailFrom: e.target.value }))}
            placeholder="Class Models &lt;info@jouwdomein.be&gt;"
            disabled={!canWrite || busy}
          />
        </div>
        {canWrite ? (
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-burgundy px-4 py-2 text-sm font-semibold text-white hover:bg-burgundyDeep disabled:opacity-50"
          >
            Opslaan
          </button>
        ) : (
          <p className="text-xs text-muted">Alleen bekijken — vraag admin.agenda.write om te wijzigen.</p>
        )}
        {saveMsg ? <p className="text-xs text-emerald-800">{saveMsg}</p> : null}
        {saveErr ? <p className="text-xs text-red-700">{saveErr}</p> : null}
      </form>

      <div className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Testmail</h2>
        <p className="mt-1 text-xs text-muted">Stuurt één test met de huidige effectieve SMTP-instelling.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            className="min-w-[12rem] flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="jouw@email.be"
            disabled={busy}
          />
          <button
            type="button"
            disabled={busy || !canWrite}
            onClick={() => void sendTest()}
            className="rounded-md border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50"
          >
            Verzend test
          </button>
        </div>
        {testMsg ? <p className="mt-2 text-xs text-emerald-800">{testMsg}</p> : null}
        {testErr ? <p className="mt-2 text-xs text-red-700">{testErr}</p> : null}
      </div>
    </div>
  );
}
