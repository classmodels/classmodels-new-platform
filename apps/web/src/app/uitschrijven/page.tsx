'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { getApiBase } from '@/lib/api';

type Info = {
  emailMasked: string;
  displayName: string | null;
  alreadyUnsubscribed: boolean;
};

function UitschrijvenInner() {
  const params = useSearchParams();
  const token = params.get('t')?.trim() || '';
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setErr('Ongeldige link. Gebruik de link onderaan een Class Models e-mail.');
      return;
    }
    setErr(null);
    try {
      const res = await fetch(`${getApiBase()}/bulk-mail/unsubscribe/info?t=${encodeURIComponent(token)}`);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Link ongeldig');
      }
      setInfo((await res.json()) as Info);
    } catch (e) {
      setInfo(null);
      setErr(e instanceof Error ? e.message : 'Kon gegevens niet laden');
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirm = async () => {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`${getApiBase()}/bulk-mail/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Uitschrijven mislukt');
      }
      setDone(true);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Uitschrijven mislukt');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-zinc-900">Uitschrijven</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Class Models — u ontvangt dan geen bulk-e-mails meer op dit adres.
        </p>

        {err ? <p className="mt-4 text-sm text-red-700">{err}</p> : null}

        {info && !err ? (
          <div className="mt-4 space-y-3 text-sm text-zinc-800">
            {info.displayName ? <p>Account: {info.displayName}</p> : null}
            <p>
              E-mail: <strong>{info.emailMasked}</strong>
            </p>
            {done || info.alreadyUnsubscribed ? (
              <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
                U bent uitgeschreven. U ontvangt geen nieuwsbrieven meer op dit adres.
              </p>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirm()}
                className="w-full rounded bg-[#6b1f3a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5a1a31] disabled:opacity-50"
              >
                {busy ? 'Bezig…' : 'Bevestig uitschrijving'}
              </button>
            )}
          </div>
        ) : null}

        {!token && !info ? (
          <p className="mt-4 text-sm text-muted">Open deze pagina via de link in uw e-mail.</p>
        ) : null}
      </div>
    </main>
  );
}

export default function UitschrijvenPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-muted">Laden…</p>}>
      <UitschrijvenInner />
    </Suspense>
  );
}
