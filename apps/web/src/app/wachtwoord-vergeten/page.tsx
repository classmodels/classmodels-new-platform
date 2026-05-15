'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function WachtwoordVergetenPage() {
  const [identifier, setIdentifier] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const res = await apiFetch<{ message?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      setMsg(res.message ?? 'Als er een account is, ontvang je een e-mail met instructies.');
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
      {msg ? <p className="mt-4 text-sm text-green-800">{msg}</p> : null}
      {err ? <p className="mt-4 text-sm text-red-700">{err}</p> : null}
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
          Verstuur link
        </button>
      </form>
      <Link href="/" className="mt-6 inline-block text-sm text-burgundy underline">
        Terug naar beginpagina
      </Link>
    </div>
  );
}
