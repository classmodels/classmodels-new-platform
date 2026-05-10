'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { getApiBase } from '@/lib/api';

function AnnuleerInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<'idle' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState<string | null>(null);

  const annuleer = async () => {
    if (!token?.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`${getApiBase()}/agenda/cancel`, {
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
      setMsg('Uw afspraak is geannuleerd. U ontvangt geen herinnering meer voor dit moment.');
    } catch (e: unknown) {
      setDone('err');
      setMsg(e instanceof Error ? e.message : 'Annuleren mislukt.');
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
        <p className="text-base font-semibold text-zinc-900">Annulering bevestigd</p>
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
      <h1 className="text-lg font-semibold text-zinc-900">Afspraak annuleren</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Bevestig dat u deze online afspraak wilt annuleren. Het tijdslot wordt weer vrijgegeven.
      </p>
      {done === 'err' && msg ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{msg}</p>
      ) : null}
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={annuleer}
          className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {busy ? 'Bezig…' : 'Ja, annuleren'}
        </button>
        <Link
          href="/portal/guest"
          className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Niet annuleren
        </Link>
      </div>
    </div>
  );
}

export default function AnnuleerPage() {
  return (
    <Suspense
      fallback={<div className="px-4 py-16 text-center text-sm text-zinc-500">Laden…</div>}
    >
      <AnnuleerInner />
    </Suspense>
  );
}
