'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiFetch } from '@/lib/api';
import { portalTitlebarPillClass } from '@/components/model-portal/portal-titlebar-pill';

type TryoutEdition = {
  slug: string;
  title: string;
  eventDate: string;
  dateLabelNl: string;
  venueName: string;
  addressLine: string;
  postalCode: string;
  city: string;
  doorsTimeNl: string;
  showTimeNl: string;
};

type TryoutState = {
  edition: TryoutEdition;
  registration: {
    interestStatus: string;
    termsAcceptedAt: string | null;
    paymentStatus: string | null;
    molliePaymentId: string | null;
  };
  pricing: { currency: string; amount: string };
};

type CheckoutOk = { checkoutUrl: string; paymentId: string; tryoutRegistrationId: string };
type CheckoutSkip = { skipCheckout: true; reason: string };

export function ModelTryoutModeshowTab({
  onHeaderRightChange,
}: {
  onHeaderRightChange?: (node: ReactNode | null) => void;
}) {
  const { token, can } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const canBriefs = can('portal.model.briefs.read');
  const canPay = can('payments.checkout');
  const canAdminList = can('admin.billing.read');

  const [state, setState] = useState<TryoutState | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [termsTick, setTermsTick] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const load = useCallback(async () => {
    if (!token || !canBriefs) {
      setState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const s = await apiFetch<TryoutState>('/portal/model/tryout-modeshow', { token });
      setState(s);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Laden mislukt');
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [token, canBriefs]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get('tryout') !== 'return') return;
    void load();
    const q = new URLSearchParams(searchParams.toString());
    q.delete('tryout');
    const s = q.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }, [searchParams, load, router, pathname]);

  const interest = useCallback(
    async (interested: boolean) => {
      if (!token) return;
      setBusy(true);
      setErr(null);
      try {
        const s = await apiFetch<TryoutState>('/portal/model/tryout-modeshow/interest', {
          method: 'POST',
          token,
          body: JSON.stringify({ interested }),
        });
        setState(s);
        if (!interested) setTermsTick(false);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Opslaan mislukt');
      } finally {
        setBusy(false);
      }
    },
    [token],
  );

  const acceptTerms = useCallback(async () => {
    if (!token) return;
    if (!termsTick) {
      setErr('Vink het vakje aan om akkoord te gaan met de algemene voorwaarden.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const s = await apiFetch<TryoutState>('/portal/model/tryout-modeshow/terms', {
        method: 'POST',
        token,
        body: JSON.stringify({ accepted: true }),
      });
      setState(s);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Opslaan mislukt');
    } finally {
      setBusy(false);
    }
  }, [token, termsTick]);

  const checkout = useCallback(async () => {
    if (!token || !canPay) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch<CheckoutOk | CheckoutSkip>('/portal/model/tryout-modeshow/checkout', {
        method: 'POST',
        token,
        body: JSON.stringify({}),
      });
      if ('skipCheckout' in res && res.skipCheckout) {
        setErr(res.reason);
        await load();
        return;
      }
      if ('checkoutUrl' in res && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      setErr('Onverwacht antwoord van de server.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Betaling starten mislukt');
    } finally {
      setBusy(false);
    }
  }, [token, canPay, load]);

  const reg = state?.registration;
  const status = reg?.interestStatus ?? 'none';
  const paid = status === 'paid';
  const declined = status === 'declined';
  const interested = status === 'interested';
  const hasTerms = Boolean(reg?.termsAcceptedAt);

  const headerRight = useMemo(() => {
    if (!canBriefs || loading || !state) return null;
    if (paid) {
      return <span className="text-[11px] font-medium text-white/90">Ingeschreven</span>;
    }
    if (status === 'none') {
      return (
        <div className="flex flex-wrap justify-end gap-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => void interest(true)}
            className={portalTitlebarPillClass(false)}
          >
            Geïnteresseerd
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void interest(false)}
            className={portalTitlebarPillClass(false)}
          >
            Niet geïnteresseerd
          </button>
        </div>
      );
    }
    if (declined) {
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => void interest(true)}
          className={portalTitlebarPillClass(false)}
        >
          Toch geïnteresseerd
        </button>
      );
    }
    if (interested && !hasTerms) {
      return (
        <button
          type="button"
          disabled={busy || !termsTick}
          onClick={() => void acceptTerms()}
          className={portalTitlebarPillClass(termsTick)}
        >
          Akkoord — verder naar betaling
        </button>
      );
    }
    if (interested && hasTerms && !paid) {
      if (!canPay) {
        return (
          <span className="max-w-[14rem] text-right text-[10px] leading-snug text-white/85">
            Betalen niet beschikbaar op dit account. Neem contact op met Class-Models.
          </span>
        );
      }
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => void checkout()}
          className={portalTitlebarPillClass(false)}
        >
          {busy ? 'Bezig…' : `Betalen met Mollie (€${state.pricing.amount})`}
        </button>
      );
    }
    return null;
  }, [
    acceptTerms,
    busy,
    canBriefs,
    canPay,
    checkout,
    declined,
    hasTerms,
    interested,
    interest,
    loading,
    paid,
    state,
    status,
    termsTick,
  ]);

  useEffect(() => {
    onHeaderRightChange?.(headerRight);
    return () => onHeaderRightChange?.(null);
  }, [onHeaderRightChange, headerRight]);

  if (!canBriefs) {
    return (
      <p className="text-sm text-muted">
        U heeft geen toegang tot deze pagina. Vraag een beheerder om de permissie{' '}
        <code className="rounded bg-zinc-100 px-1 text-xs">portal.model.briefs.read</code>.
      </p>
    );
  }

  if (loading && !state) {
    return <p className="text-sm text-muted">Laden…</p>;
  }

  if (!state) {
    return <p className="text-sm text-red-700">{err ?? 'Kon de try-out gegevens niet laden.'}</p>;
  }

  const e = state.edition;
  const addr = `${e.venueName}\n${e.addressLine}\n${e.postalCode} ${e.city}`;
  const regView = state.registration;

  return (
    <div className="space-y-4 text-sm leading-relaxed text-zinc-800">
      {err ? <p className="text-xs text-red-700">{err}</p> : null}

      <div className="border border-line bg-zinc-50/80 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-burgundy">{e.title}</p>
        <p className="mt-2 font-semibold text-ink">{e.dateLabelNl}</p>
        <p className="mt-1 text-xs text-zinc-700">
          Deuren open om <strong>{e.doorsTimeNl}</strong> — show start om <strong>{e.showTimeNl}</strong>
        </p>
        <p className="mt-3 whitespace-pre-line text-xs text-zinc-800">{addr}</p>
      </div>

      <div className="border border-line p-4">
        <p className="text-xs font-semibold text-ink">Uw keuze</p>
        {paid ? (
          <p className="mt-2 text-sm text-emerald-900">
            U bent ingeschreven en betaald voor deze try-out modeshow. Het bureau bevestigt uw aanwezigheid verder per
            e-mail indien nodig.
          </p>
        ) : declined ? (
          <p className="mt-2 text-sm text-zinc-700">
            U heeft aangegeven niet geïnteresseerd te zijn. Wijzigt uw situatie, gebruik dan de knop in de rode titelbalk.
          </p>
        ) : status === 'none' ? (
          <p className="mt-2 text-sm text-zinc-700">
            Geeft u in de titelbalk aan of u al dan niet geïnteresseerd bent om zich in te schrijven voor deze try-out
            modeshow (zoals bij de oude inschrijfflow).
          </p>
        ) : interested && !hasTerms ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-zinc-700">
              Lees de{' '}
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="font-medium text-burgundy underline hover:text-burgundyDeep"
              >
                algemene voorwaarden
              </button>{' '}
              en ga akkoord. Vink hieronder aan en bevestig daarna in de rode titelbalk.
            </p>
            <label className="flex cursor-pointer items-start gap-2 text-xs text-zinc-800">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300"
                checked={termsTick}
                onChange={(ev) => {
                  const v = ev.target.checked;
                  setTermsTick(v);
                  if (v) setTermsOpen(true);
                }}
              />
              <span>
                Ik ga akkoord met de algemene voorwaarden van Class-Models en bevestig dat de gegevens van mijn account
                gebruikt mogen worden voor deze inschrijving.
              </span>
            </label>
            {termsTick ? (
              <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                Je hebt de algemene voorwaarden gelezen en geaccepteerd.
              </p>
            ) : null}
          </div>
        ) : interested && hasTerms ? (
          <div className="mt-2 space-y-2">
            <p className="text-sm text-zinc-700">
              Voorwaarden geaccepteerd op{' '}
              {regView.termsAcceptedAt
                ? new Intl.DateTimeFormat('nl-BE', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(new Date(regView.termsAcceptedAt))
                : '—'}
              .
            </p>
            {regView.paymentStatus && regView.paymentStatus !== 'paid' ? (
              <p className="text-xs text-muted">
                Betalingsstatus: <strong className="text-ink">{regView.paymentStatus}</strong>
                {regView.paymentStatus === 'open' || regView.paymentStatus === 'pending'
                  ? ' — rond de betaling af in Mollie of gebruik opnieuw «Betalen met Mollie».'
                  : null}
              </p>
            ) : null}
            {canPay ? (
              <p className="text-xs text-zinc-700">
                Inschrijving is compleet na betaling van <strong>€{state.pricing.amount}</strong> via Mollie (éénmalig,
                niet terugkerend abonnement).
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-700">Onbekende status. Vernieuw de pagina of neem contact op.</p>
        )}
      </div>

      {termsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-lg border border-white/10 bg-white shadow-xl">
            <div className="flex items-center justify-between bg-burgundy px-4 py-3 text-white">
              <p className="text-xs font-bold uppercase tracking-wide">Algemene voorwaarden</p>
              <button
                type="button"
                onClick={() => setTermsOpen(false)}
                className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/20"
              >
                Sluiten
              </button>
            </div>
            <div className="max-h-[65vh] overflow-auto px-4 py-4 text-sm text-zinc-800">
              <p className="font-semibold text-ink">Artikel 1 – Inschrijving en Deelname</p>
              <p className="mt-2">1.1 Door inschrijving voor de Try-Out Modeshow verklaart het model zich akkoord met deze algemene voorwaarden.</p>
              <p className="mt-1">1.2 Deelname aan de Try-Out Modeshow is geheel vrijwillig. Na inschrijving en akkoordverklaring met deze voorwaarden is deelname verplicht.</p>
              <p className="mt-1">
                1.3 De deelnamekost bedraagt <strong>€600,-</strong>. Hiervoor ontvangt het model <strong>30 inkomkaarten</strong> voor het evenement,
                welke vrij mogen worden verdeeld of verkocht.
              </p>

              <p className="mt-4 font-semibold text-ink">Artikel 2 – Annulering en Terugbetaling</p>
              <p className="mt-2">2.1 Bij annulering van deelname door het model, vindt geen restitutie van het inschrijfgeld plaats.</p>
              <p className="mt-1">2.2 Bij annulering zonder aantoonbare overmacht wordt het model uit het bestand van Class-Models verwijderd en uitgesloten van toekomstige opdrachten.</p>
              <p className="mt-1">2.3 Indien de Try-Out Modeshow door overmacht aan de zijde van Class-Models niet kan doorgaan én niet kan worden verplaatst naar een andere datum, zal het door het model betaalde bedrag volledig worden terugbetaald.</p>
              <p className="mt-1">2.4 In alle andere gevallen is restitutie van het inschrijfgeld uitgesloten.</p>

              <p className="mt-4 font-semibold text-ink">Artikel 3 – Verplichtingen van het Model</p>
              <p className="mt-2">3.1 Het model verbindt zich ertoe deel te nemen aan drie oefenlessen in aanloop naar de Try-Out Modeshow.</p>
              <p className="mt-1">3.2 Het model dient op de afgesproken dagen en tijden kleding te passen bij de deelnemende zaken.</p>
              <p className="mt-1">3.3 Op de dag van de Try-Out Modeshow heeft het model recht op visagie, haarstyling, de aanmaak van setcards, foto’s en een volledige filmopname van de show.</p>

              <p className="mt-4 font-semibold text-ink">Artikel 4 – Gedragscode en Vertrouwelijkheid</p>
              <p className="mt-2">4.1 Het model dient zich te allen tijde professioneel, respectvol en positief op te stellen tegenover de organisatie, andere modellen, klanten en betrokkenen.</p>
              <p className="mt-1">4.2 Negatief gedrag, roddelen, het verspreiden van negatieve opmerkingen over de organisatie, andere modellen of klanten, evenals het aanzetten tot negativiteit, leidt tot onmiddellijke uitsluiting van de Try-Out Modeshow en verwijdering uit het bestand van Class-Models.</p>
              <p className="mt-1">4.3 Opmerkingen, klachten of suggesties kunnen altijd rechtstreeks bij de directie worden gemeld.</p>
              <p className="mt-1">4.4 Modellen die getuige zijn van negatief gedrag of negatieve uitlatingen van andere modellen, zijn verplicht dit te melden aan de directie. Indien zij dit nalaten, worden zij als medeplichtig beschouwd en kunnen ook zij worden uitgesloten.</p>
              <p className="mt-1">4.5 Het is het model niet toegestaan interne informatie van Class-Models of persoonlijke gegevens van zichzelf aan klanten te verstrekken.</p>
              <p className="mt-1">4.6 Het model is verboden om, na bemiddeling door Class-Models, zelfstandig en zonder tussenkomst van Class-Models opdrachten voor klanten uit te voeren, zowel betaald als onbetaald. Overtreding hiervan leidt tot een schadevergoeding ten gunste van Class-Models.</p>

              <p className="mt-4 font-semibold text-ink">Artikel 5 – Samenwerking met Klanten (Kledingzaken)</p>
              <p className="mt-2">5.1 De klanten (kledingzaken) ontvangen een lijst van alle modellen die bij hen komen passen. Zij vullen voor elk model een evaluatieformulier in, dat door Class-Models wordt geëvalueerd.</p>
              <p className="mt-1">5.2 Het model dient altijd stipt op tijd aanwezig te zijn bij afspraken met klanten.</p>
              <p className="mt-1">
                5.3 De hygiëne van het model dient optimaal te zijn bij elk bezoek aan klanten:
                <br />• Haren verzorgd en schoon
                <br />• Propere, nette kleding en schoeisel
                <br />• Indien mogelijk licht opgemaakt
                <br />• Een vriendelijke, representatieve houding
              </p>
              <p className="mt-1">5.4 Het model dient de kleding te dragen die door de winkel is uitgekozen voor de modeshow. Discussie hierover is niet toegestaan.</p>
              <p className="mt-1">5.5 Een goede eerste indruk is essentieel; het model dient zich hiernaar te gedragen.</p>

              <p className="mt-4 font-semibold text-ink">Artikel 6 – Uitsluiting en Sancties</p>
              <p className="mt-2">6.1 Ongepast gedrag, het niet naleven van deze voorwaarden of het niet melden van negatieve uitlatingen kan leiden tot onmiddellijke uitsluiting van deelname, zonder recht op compensatie.</p>
              <p className="mt-1">6.2 Het model wordt bij uitsluiting per e-mail op de hoogte gesteld.</p>

              <p className="mt-4 font-semibold text-ink">Artikel 7 – Overige Bepalingen</p>
              <p className="mt-2">7.1 In alle gevallen waarin deze voorwaarden niet voorzien, beslist Class-Models.</p>
              <p className="mt-1">7.2 Door inschrijving verklaart het model deze algemene voorwaarden te hebben gelezen, begrepen en hiermee akkoord te gaan.</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 bg-zinc-50 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  setTermsTick(false);
                  setTermsOpen(false);
                }}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                Niet akkoord
              </button>
              <button
                type="button"
                onClick={() => {
                  setTermsTick(true);
                  setTermsOpen(false);
                }}
                className="rounded-full bg-burgundy px-4 py-2 text-xs font-semibold text-white hover:bg-burgundyDeep"
              >
                Akkoord
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
