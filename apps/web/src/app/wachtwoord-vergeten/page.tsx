'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function WachtwoordVergetenPage() {
  const [identifier, setIdentifier] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setSent(false);
    setBusy(true);
    try {
      const res = await apiFetch<{ message?: string; emailSent?: boolean }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      setMsg(
        res.message ??
          'Als er een account is, ontvang je een e-mail met instructies. Controleer ook je spamfolder.',
      );
      setSent(res.emailSent === true);
    } catch (er) {
      setErr(er instanceof Error ? er.message : 'Er ging iets mis.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-serif text-2xl text-burgundy">Wachtwoord vergeten</h1>
      <p className="mt-2 text-sm text-muted">
        Vul je <strong>e-mailadres</strong> of <strong>telefoonnummer</strong> in. We sturen een link naar het
        e-mailadres van je account.
      </p>
      {msg ? (
        <div
          className={`mt-4 rounded-cm border px-4 py-3 text-sm ${
            sent ? 'border-green-300 bg-green-50 text-green-900' : 'border-zinc-200 bg-zinc-50 text-zinc-800'
          }`}
          role="status"
        >
          <p className="font-semibold">{sent ? 'E-mail verstuurd' : 'Verzoek ontvangen'}</p>
          <p className="mt-1">{msg}</p>
        </div>
      ) : null}
      {err ? <p className="mt-4 text-sm text-red-700">{err}</p> : null}
      {!msg ? (
        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-cm border border-line bg-white p-6 shadow-sm">
          <input
            className="w-full rounded-cm border border-line px-3 py-2 text-sm"
            placeholder="E-mail of telefoonnummer"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-cm bg-burgundy py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy ? 'Bezig…' : 'Verstuur link'}
          </button>
        </form>
      ) : (
        <div className="mt-6">
          <Link href="/" className="inline-block text-sm text-burgundy underline">
            Terug naar beginpagina
          </Link>
        </div>
      )}
      {!msg ? (
        <Link href="/" className="mt-6 inline-block text-sm text-burgundy underline">
          Terug naar beginpagina
        </Link>
      ) : null}
    </div>
  );
}
