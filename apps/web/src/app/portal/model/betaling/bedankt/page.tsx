'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiFetch } from '@/lib/api';

type Kind = 'premium' | 'tryout';

type TryoutState = {
  registration: { interestStatus: string };
};

function BedanktInner() {
  const searchParams = useSearchParams();
  const kind: Kind = searchParams.get('soort') === 'tryout' ? 'tryout' : 'premium';
  const { user, loading, token, refreshMe } = useAuth();
  const [checking, setChecking] = useState(true);
  const [tryoutPaid, setTryoutPaid] = useState<boolean | null>(null);

  const refreshStatus = useCallback(async () => {
    await refreshMe().catch(() => null);
    if (kind === 'tryout' && token) {
      try {
        const s = await apiFetch<TryoutState>('/portal/model/tryout-modeshow', { token });
        setTryoutPaid(s.registration.interestStatus === 'paid');
      } catch {
        setTryoutPaid(null);
      }
    }
  }, [kind, token, refreshMe]);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    const run = async () => {
      await refreshStatus();
      if (!cancelled) setChecking(false);
    };
    void run();
    const interval = window.setInterval(() => {
      void refreshStatus();
    }, 4000);
    const stop = window.setTimeout(() => window.clearInterval(interval), 20000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(stop);
    };
  }, [loading, refreshStatus]);

  const backHref = kind === 'tryout' ? '/portal/model?tab=tryout-modeshow' : '/portal/model?tab=premium';
  const backLabel = kind === 'tryout' ? 'Try-out modeshow' : 'Premium';
  const title =
    kind === 'tryout' ? 'Bedankt voor je inschrijving' : 'Bedankt voor je premium-betaling';

  const premiumActive = user?.isPremium ?? false;
  const until = user?.premiumUntil
    ? new Date(user.premiumUntil).toLocaleDateString('nl-BE')
    : null;
  const confirmed = kind === 'premium' ? premiumActive : tryoutPaid === true;

  if (loading || checking) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-sm text-muted">We controleren je betaling…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
          <h1 className="font-serif text-2xl font-semibold text-ink">Bedankt</h1>
          <p className="mt-3 text-sm text-muted">
            Je betaling bij Mollie is afgerond. Log opnieuw in om je status te zien en verder te gaan in het
            modellenportaal.
          </p>
          <Link
            href={`/?next=${encodeURIComponent(`/portal/model/betaling/bedankt?soort=${kind}`)}`}
            className="mt-6 inline-block rounded-full bg-burgundy px-6 py-2.5 text-sm font-semibold text-white hover:bg-burgundyDeep"
          >
            Inloggen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 md:py-16">
      <div
        className={`overflow-hidden rounded-2xl border shadow-lg ${
          confirmed
            ? 'border-emerald-200 bg-gradient-to-b from-emerald-50 to-white'
            : 'border-amber-200 bg-gradient-to-b from-amber-50 to-white'
        }`}
      >
        <div className="border-b border-black/5 bg-zinc-900 px-6 py-8 text-center text-white">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/70">Class Models</p>
          <h1 className="mt-2 font-serif text-2xl font-semibold md:text-3xl">{title}</h1>
        </div>
        <div className="space-y-4 px-6 py-8 text-center">
          {confirmed ? (
            <p className="text-sm leading-relaxed text-emerald-900">
              <strong>Gelukt!</strong>{' '}
              {kind === 'premium' ? (
                <>
                  Premium staat actief op je account
                  {until ? ` tot ${until}.` : '.'}
                </>
              ) : (
                <>Je inschrijving voor de try-out modeshow is bevestigd.</>
              )}
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-amber-950">
              We hebben je betaling ontvangen en verwerken die nu. Dit duurt meestal enkele seconden. Je kunt deze
              pagina verversen of via de knop hieronder verder naar je portaal.
            </p>
          )}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
            <Link
              href={backHref}
              className="inline-flex items-center justify-center rounded-full bg-burgundy px-6 py-2.5 text-sm font-semibold text-white hover:bg-burgundyDeep"
            >
              Terug naar {backLabel}
            </Link>
            <Link
              href="/portal/model"
              className="inline-flex items-center justify-center rounded-full border border-line bg-white px-6 py-2.5 text-sm font-semibold text-ink hover:bg-zinc-50"
            >
              Modellenportaal home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ModelBetalingBedanktPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-muted">Laden…</div>
      }
    >
      <BedanktInner />
    </Suspense>
  );
}
