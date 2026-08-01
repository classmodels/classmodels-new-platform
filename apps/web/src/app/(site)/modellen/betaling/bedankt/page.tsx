'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiFetch } from '@/lib/api';
import { getStoredToken } from '@/lib/storage';
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
  const { user, loading, token, refreshMe, applySessionToken } = useAuth();
  const [checking, setChecking] = useState(true);
  const [tryoutPaid, setTryoutPaid] = useState<boolean | null>(null);
  const [setCardPaid, setSetCardPaid] = useState<boolean | null>(null);
  const [restoring, setRestoring] = useState(true);

  // Extra vangnet: als AuthProvider cm_resume al verwerkte is token gezet;
  // anders hier nogmaals uit storage laden.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const tok = getStoredToken();
      if (tok && !user) {
        try {
          await applySessionToken(tok, true);
        } catch {
          /* auth-context probeert zelf ook */
        }
      }
      if (!cancelled) setRestoring(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [applySessionToken, user]);

  const refreshStatus = useCallback(async () => {
    const tok = token || getStoredToken();
    if (tok) await refreshMe(tok).catch(() => null);
    if (kind === 'tryout' && tok) {
      try {
        const s = await apiFetch<TryoutState>('/portal/model/tryout-modeshow', { token: tok });
        setTryoutPaid(s.registration.interestStatus === 'paid');
      } catch {
        setTryoutPaid(null);
      }
    }
    if (kind === 'setkaart' && tok) {
      try {
        const d = await apiFetch<SetCardDraftState>('/portal/model/set-card', { token: tok });
        setSetCardPaid(!!d.setCardPaid || !d.paymentRequired);
      } catch {
        setSetCardPaid(null);
      }
    }
  }, [kind, token, refreshMe]);

  useEffect(() => {
    if (loading || restoring) return;
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
  }, [loading, restoring, refreshStatus]);

  const backHref =
    kind === 'tryout'
      ? '/modellen?tab=tryout-modeshow'
      : kind === 'setkaart'
        ? '/modellen?tab=setkaarten'
        : '/modellen?tab=premium';
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

  if (loading || restoring || checking) {
    return (
      <div className="nieuw-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <p className="nieuw-lead" style={{ margin: 0 }}>
          We controleren je betaling…
        </p>
      </div>
    );
  }

  const effectiveToken = token || getStoredToken();

  if (!user && effectiveToken) {
    return (
      <div className="nieuw-panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
        <h1 className="nieuw-h2" style={{ fontSize: 28 }}>
          Bedankt
        </h1>
        <p className="nieuw-lead" style={{ margin: '14px auto 0', textAlign: 'center' }}>
          Je betaling bij Mollie is afgerond. Je sessie wordt geladen — even geduld of ga terug naar het
          modellenportaal.
        </p>
        <div style={{ marginTop: 28 }}>
          <Link className="nieuw-btn" href={backHref}>
            Sluiten
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    // Mag zelden nog voorkomen; toon toch Sluiten i.p.v. “opnieuw inloggen” als primaire actie.
    return (
      <div className="nieuw-panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
        <h1 className="nieuw-h2" style={{ fontSize: 28 }}>
          Bedankt
        </h1>
        <p className="nieuw-lead" style={{ margin: '14px auto 0', textAlign: 'center' }}>
          Je betaling bij Mollie is afgerond. Ga terug naar het modellenportaal om je status te bekijken.
        </p>
        <div style={{ marginTop: 28 }}>
          <Link className="nieuw-btn" href={backHref}>
            Sluiten
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
            <>
              Je inschrijving voor de try-out modeshow is bevestigd. Je ontvangt ook een bevestiging per e-mail.
            </>
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
          Sluiten
        </Link>
        <Link className="nieuw-btn nieuw-btn-ghost" href="/modellen">
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
