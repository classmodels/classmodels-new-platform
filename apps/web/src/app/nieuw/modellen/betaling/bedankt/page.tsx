'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiFetch } from '@/lib/api';
import { NieuwShell } from '@/components/nieuw/NieuwShell';

type Kind = 'premium' | 'tryout' | 'setkaart';

type TryoutState = {
  registration: { interestStatus: string };
};

type SetCardDraftState = {
  setCardPaid?: boolean;
  paymentRequired?: boolean;
};

function parseKind(raw: string | null): Kind {
  if (raw === 'tryout') return 'tryout';
  if (raw === 'setkaart') return 'setkaart';
  return 'premium';
}

function BedanktInner() {
  const searchParams = useSearchParams();
  const kind = parseKind(searchParams.get('soort'));
  const { user, loading, token, refreshMe } = useAuth();
  const [checking, setChecking] = useState(true);
  const [tryoutPaid, setTryoutPaid] = useState<boolean | null>(null);
  const [setCardPaid, setSetCardPaid] = useState<boolean | null>(null);

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
    if (kind === 'setkaart' && token) {
      try {
        const d = await apiFetch<SetCardDraftState>('/portal/model/set-card', { token });
        setSetCardPaid(!!d.setCardPaid || !d.paymentRequired);
      } catch {
        setSetCardPaid(null);
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

  const backHref =
    kind === 'tryout'
      ? '/nieuw/modellen?tab=tryout-modeshow'
      : kind === 'setkaart'
        ? '/nieuw/modellen?tab=setkaarten'
        : '/nieuw/modellen?tab=premium';
  const backLabel =
    kind === 'tryout' ? 'Try-out modeshow' : kind === 'setkaart' ? 'Setkaarten' : 'Premium';
  const title =
    kind === 'tryout'
      ? 'Bedankt voor je inschrijving'
      : kind === 'setkaart'
        ? 'Bedankt voor je betaling'
        : 'Bedankt voor je premium-betaling';

  const premiumActive = user?.isPremium ?? false;
  const until = user?.premiumUntil
    ? new Date(user.premiumUntil).toLocaleDateString('nl-BE')
    : null;
  const confirmed =
    kind === 'premium' ? premiumActive : kind === 'setkaart' ? setCardPaid === true : tryoutPaid === true;

  if (loading || checking) {
    return (
      <div className="nieuw-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <p className="nieuw-lead" style={{ margin: 0 }}>
          We controleren je betaling…
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="nieuw-panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
        <h1 className="nieuw-h2" style={{ fontSize: 28 }}>
          Bedankt
        </h1>
        <p className="nieuw-lead" style={{ margin: '14px auto 0', textAlign: 'center' }}>
          Je betaling bij Mollie is afgerond. Log opnieuw in om je status te zien en verder te gaan in het
          modellenportaal.
        </p>
        <div style={{ marginTop: 28 }}>
          <Link
            className="nieuw-btn"
            href={`/nieuw/inloggen?next=${encodeURIComponent(`/nieuw/modellen/betaling/bedankt?soort=${kind}`)}`}
          >
            Inloggen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="nieuw-panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
      <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.55 }}>
        Class Models
      </p>
      <h1 className="nieuw-h2" style={{ fontSize: 28, marginTop: 8 }}>
        {title}
      </h1>
      {confirmed ? (
        <p className="nieuw-lead" style={{ margin: '14px auto 0', textAlign: 'center' }}>
          <strong>Gelukt!</strong>{' '}
          {kind === 'premium' ? (
            <>
              Premium staat actief op je account
              {until ? ` tot ${until}.` : '.'}
            </>
          ) : kind === 'setkaart' ? (
            <>Je setkaart-betaling is ontvangen. Je kunt nu versturen naar Class-Models.</>
          ) : (
            <>Je inschrijving voor de try-out modeshow is bevestigd.</>
          )}
        </p>
      ) : (
        <p className="nieuw-lead" style={{ margin: '14px auto 0', textAlign: 'center' }}>
          We hebben je betaling ontvangen en verwerken die nu. Dit duurt meestal enkele seconden. Je kunt deze
          pagina verversen of via de knop hieronder verder naar je portaal.
        </p>
      )}
      <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
        <Link className="nieuw-btn" href={backHref}>
          Terug naar {backLabel}
        </Link>
        <Link className="nieuw-btn nieuw-btn-ghost" href="/nieuw/modellen">
          Modellenportaal home
        </Link>
      </div>
    </div>
  );
}

export default function NieuwModelBetalingBedanktPage() {
  return (
    <NieuwShell portal="modellen">
      <section className="nieuw-sectie" style={{ paddingTop: 28 }}>
        <div className="nieuw-wrap">
          <Suspense
            fallback={
              <div className="nieuw-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
                Laden…
              </div>
            }
          >
            <BedanktInner />
          </Suspense>
        </div>
      </section>
    </NieuwShell>
  );
}
