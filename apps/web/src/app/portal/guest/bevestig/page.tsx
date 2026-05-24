'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { getApiBase } from '@/lib/api';

function BevestigInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<'idle' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState<string | null>(null);

  const bevestig = async () => {
    if (!token?.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`${getApiBase()}/agenda/confirm-attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });
      const text = await res.text();
      if (!res.ok) {
        let m = text || res.statusText;
        try {
          const j = JSON.parse(text) as { message?: string | string[] };
          if (Array.isArray(j.message)) m = j.message.join(', ');
          else if (j.message) m = String(j.message);
        } catch {
          /**/
        }
        throw new Error(m);
      }
      setDone('ok');
      setMsg('Bedankt — uw komst is bevestigd. Tot binnenkort bij Class Models.');
    } catch (e: unknown) {
      setDone('err');
      setMsg(e instanceof Error ? e.message : 'Bevestigen mislukt.');
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-zinc-600">Deze link is ongeldig of onvolledig.</p>
        <Link href="/portal/guest" className="mt-4 inline-block text-sm font-medium text-burgundy underline">
          Naar het gastenportaal
        </Link>
      </div>
    );
  }

  if (done === 'ok') {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-base font-semibold text-zinc-900">Komst bevestigd</p>
        <p className="mt-3 text-sm text-zinc-600">{msg}</p>
        <Link
          href="/portal/guest"
          className="mt-6 inline-block rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Sluiten
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-lg font-semibold text-zinc-900">Komst bevestigen</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Dit kan op de dag <strong>vóór</strong> uw afspraak of op de <strong>dag zelf</strong> tot het tijdstip van uw
        afspraak (Belgische tijd).
      </p>
      {done === 'err' && msg ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{msg}</p>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={bevestig}
        className="mt-6 w-full rounded-md bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0d9488] disabled:opacity-50"
      >
        {busy ? 'Bezig…' : 'Ik bevestig mijn komst'}
      </button>
      <p className="mt-4 text-center text-xs text-zinc-500">
        <Link href="/portal/guest" className="text-burgundy underline">
          Terug naar het gastenportaal
        </Link>
      </p>
    </div>
  );
}

export default function GuestBevestigPage() {
  return (
    <Suspense
      fallback={<div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-zinc-500">Laden…</div>}
    >
      <BevestigInner />
    </Suspense>
  );
}
