'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { apiFetch } from '@/lib/api';
import { portalTitlebarPillClass } from '@/components/model-portal/portal-titlebar-pill';
import { TryoutModeshowInfoContent } from '@/components/model-portal/tryout-modeshow-info-content';

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
    isFree?: boolean;
    couponCode?: string | null;
    listPrice?: string | null;
    discountAmount?: string | null;
    amount?: string | null;
  };
  pricing: { currency: string; amount: string };
};

type CheckoutOk = { checkoutUrl: string; paymentId: string; tryoutRegistrationId: string };
type CheckoutSkip = { skipCheckout: true; reason: string; freeOrder?: boolean };
type CouponPreview = {
  code: string;
  listPrice: string;
  discountAmount: string;
  finalAmount: string;
  isFree: boolean;
};

type Panel = 'summary' | 'info';

function formatPrice(amount: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `€ ${amount}`;
  return new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function ModelTryoutModeshowTab({
  onHeaderRightChange,
}: {
  onHeaderRightChange?: (node: ReactNode | null) => void;
}) {
  const { token, can } = useAuth();
  const canBriefs = can('portal.model.briefs.read');
  const canPay = can('payments.checkout');

  const [state, setState] = useState<TryoutState | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [termsTick, setTermsTick] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>('summary');
  const [couponDraft, setCouponDraft] = useState('');
  const [couponPreview, setCouponPreview] = useState<CouponPreview | null>(null);
  const registerRef = useRef<HTMLDivElement | null>(null);

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
      if (s.registration.termsAcceptedAt) setTermsTick(true);
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

  const scrollToRegister = useCallback(() => {
    window.setTimeout(() => {
      registerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, []);

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
        setPanel('summary');
        if (!interested) {
          setTermsTick(false);
        } else {
          scrollToRegister();
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Opslaan mislukt');
      } finally {
        setBusy(false);
      }
    },
    [token, scrollToRegister],
  );

  const checkout = useCallback(async () => {
    if (!token || !canPay) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch<CheckoutOk | CheckoutSkip>('/portal/model/tryout-modeshow/checkout', {
        method: 'POST',
        token,
        body: JSON.stringify({
          couponCode: couponPreview?.code || couponDraft.trim() || undefined,
        }),
      });
      if ('skipCheckout' in res && res.skipCheckout) {
        if (res.freeOrder) {
          await load();
          setErr(null);
          setPanel('summary');
          return;
        }
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
  }, [token, canPay, load, couponPreview?.code, couponDraft]);

  const applyCoupon = useCallback(async () => {
    if (!token) return;
    const code = couponDraft.trim();
    if (!code) {
      setCouponPreview(null);
      setErr('Vul een couponcode in.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const preview = await apiFetch<CouponPreview>('/portal/model/tryout-modeshow/coupon-preview', {
        method: 'POST',
        token,
        body: JSON.stringify({ couponCode: code }),
      });
      setCouponPreview(preview);
    } catch (e) {
      setCouponPreview(null);
      setErr(e instanceof Error ? e.message : 'Coupon ongeldig');
    } finally {
      setBusy(false);
    }
  }, [token, couponDraft]);

  const goToCheckout = useCallback(async () => {
    if (!token || !canPay) return;
    if (!termsTick) {
      setErr('Vink het vakje aan om akkoord te gaan met de algemene voorwaarden.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      if (!state?.registration.termsAcceptedAt) {
        const s = await apiFetch<TryoutState>('/portal/model/tryout-modeshow/terms', {
          method: 'POST',
          token,
          body: JSON.stringify({ accepted: true }),
        });
        setState(s);
      }
      const res = await apiFetch<CheckoutOk | CheckoutSkip>('/portal/model/tryout-modeshow/checkout', {
        method: 'POST',
        token,
        body: JSON.stringify({
          couponCode: couponPreview?.code || couponDraft.trim() || undefined,
        }),
      });
      if ('skipCheckout' in res && res.skipCheckout) {
        if (res.freeOrder) {
          await load();
          return;
        }
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
  }, [
    token,
    canPay,
    termsTick,
    state?.registration.termsAcceptedAt,
    load,
    couponPreview?.code,
    couponDraft,
  ]);

  const reg = state?.registration;
  const status = reg?.interestStatus ?? 'none';
  const paid = status === 'paid';
  const declined = status === 'declined';
  const interested = status === 'interested';
  const hasTerms = Boolean(reg?.termsAcceptedAt);
  const effectiveAmount = couponPreview?.finalAmount ?? state?.pricing.amount ?? '600';
  const priceLabel = formatPrice(effectiveAmount);

  const headerBtn = useCallback(
    (
      label: string,
      onClick: () => void,
      opts?: { variant?: 'join' | 'decline' | 'default' | 'primary'; disabled?: boolean },
    ) => {
      const variant = opts?.variant ?? 'default';
      const inline = !onHeaderRightChange;
      if (inline) {
        let className = 'nieuw-btn nieuw-btn-ghost';
        let style: CSSProperties | undefined;
        if (variant === 'join') {
          className = 'nieuw-btn';
          style = {
            background: '#b8e0c8',
            color: '#14301f',
            borderColor: '#8fc9a6',
          };
        } else if (variant === 'decline') {
          className = 'nieuw-btn';
          style = {
            background: '#c43c3c',
            color: '#fff',
            borderColor: '#a83232',
          };
        } else if (variant === 'primary') {
          className = 'nieuw-btn';
        }
        return (
          <button
            type="button"
            disabled={opts?.disabled || busy}
            onClick={onClick}
            className={className}
            style={style}
          >
            {label}
          </button>
        );
      }
      return (
        <button
          type="button"
          disabled={opts?.disabled || busy}
          onClick={onClick}
          className={portalTitlebarPillClass(variant === 'primary' || variant === 'join')}
          style={
            variant === 'join'
              ? { background: '#b8e0c8', color: '#14301f', borderColor: '#8fc9a6' }
              : variant === 'decline'
                ? { background: '#c43c3c', color: '#fff', borderColor: '#a83232' }
                : undefined
          }
        >
          {label}
        </button>
      );
    },
    [busy, onHeaderRightChange],
  );

  const computedHeaderRight = useMemo(() => {
    if (!canBriefs || loading || !state) return null;

    if (paid) {
      return (
        <div className="flex flex-wrap justify-end gap-2">
          {headerBtn('Info try-out modeshow', () => setPanel((p) => (p === 'info' ? 'summary' : 'info')))}
          <span className="self-center text-[11px] font-medium" style={{ color: 'var(--n-gold)' }}>
            Ingeschreven{reg?.isFree ? ' (gratis)' : ''}
          </span>
        </div>
      );
    }

    const buttons: ReactNode[] = [];

    if (status === 'none' || declined) {
      buttons.push(
        headerBtn('Ik wens deel te nemen', () => void interest(true), { variant: 'join' }),
        headerBtn('Ik wens niet deel te nemen', () => void interest(false), { variant: 'decline' }),
      );
    } else if (interested) {
      buttons.push(
        headerBtn('Ik wens niet deel te nemen', () => void interest(false), { variant: 'decline' }),
        !hasTerms
          ? headerBtn('Akkoord — verder naar afrekenen', () => void goToCheckout(), {
              variant: 'primary',
              disabled: !termsTick,
            })
          : canPay
            ? headerBtn(
                busy ? 'Bezig…' : couponPreview?.isFree ? 'Gratis inschrijven' : `Afrekenen (${priceLabel})`,
                () => void checkout(),
                { variant: 'primary' },
              )
            : null,
      );
    }

    buttons.push(
      headerBtn(panel === 'info' ? 'Terug' : 'Info try-out modeshow', () =>
        setPanel((p) => (p === 'info' ? 'summary' : 'info')),
      ),
    );

    return <div className="flex flex-wrap justify-end gap-2">{buttons}</div>;
  }, [
    busy,
    canBriefs,
    canPay,
    checkout,
    couponPreview?.isFree,
    declined,
    goToCheckout,
    hasTerms,
    headerBtn,
    interest,
    interested,
    loading,
    paid,
    panel,
    priceLabel,
    reg?.isFree,
    state,
    status,
    termsTick,
  ]);

  useEffect(() => {
    onHeaderRightChange?.(computedHeaderRight);
    return () => onHeaderRightChange?.(null);
  }, [onHeaderRightChange, computedHeaderRight]);

  if (!canBriefs) {
    return (
      <p className="nieuw-lead" style={{ margin: 0 }}>
        U heeft geen toegang tot deze pagina. Neem contact op met Class-Models.
      </p>
    );
  }

  if (loading && !state) {
    return (
      <p className="nieuw-lead" style={{ margin: 0 }}>
        Laden…
      </p>
    );
  }

  if (!state) {
    return (
      <p className="nieuw-lead" style={{ margin: 0, color: '#f87171' }}>
        {err ?? 'Kon de try-out gegevens niet laden.'}
      </p>
    );
  }

  const e = state.edition;
  const addr = `${e.venueName}\n${e.addressLine}\n${e.postalCode} ${e.city}`;
  const regView = state.registration;
  const showRegister = interested || paid;

  return (
    <div className="space-y-4 text-sm leading-relaxed">
      {!onHeaderRightChange ? (
        <div className="mb-1 flex flex-wrap justify-end gap-2">{computedHeaderRight}</div>
      ) : null}

      {err ? (
        <p className="text-xs" style={{ color: '#f87171', margin: 0 }}>
          {err}
        </p>
      ) : null}

      {panel === 'info' ? (
        <div className="nieuw-panel">
          <TryoutModeshowInfoContent priceLabel={priceLabel} />
        </div>
      ) : (
        <>
          <div className="nieuw-panel">
            <p
              className="nieuw-label"
              style={{ color: 'var(--n-gold)', letterSpacing: '0.14em', margin: 0 }}
            >
              {e.title}
            </p>
            <p style={{ margin: '12px 0 0', fontWeight: 700, color: 'var(--n-ink)', fontSize: 16 }}>
              {e.dateLabelNl}
            </p>
            <p style={{ margin: '8px 0 0', color: 'var(--n-mut)', fontSize: 13 }}>
              Deuren open om <strong style={{ color: 'var(--n-ink)' }}>{e.doorsTimeNl}</strong> — show start om{' '}
              <strong style={{ color: 'var(--n-ink)' }}>{e.showTimeNl}</strong>
            </p>
            <p
              style={{
                margin: '14px 0 0',
                whiteSpace: 'pre-line',
                color: 'var(--n-mut)',
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              {addr}
            </p>
          </div>

          {status === 'none' ? (
            <div className="nieuw-panel">
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--n-ink)' }}>Uw keuze</p>
              <p style={{ margin: '10px 0 0', color: 'var(--n-mut)', fontSize: 13, lineHeight: 1.6 }}>
                Gebruik de knoppen rechtsboven om aan te geven of u wilt deelnemen aan de try-out modeshow, of lees
                eerst de info.
              </p>
            </div>
          ) : null}

          {declined ? (
            <div className="nieuw-panel">
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--n-ink)' }}>Uw keuze</p>
              <p style={{ margin: '10px 0 0', color: 'var(--n-mut)', fontSize: 13, lineHeight: 1.6 }}>
                U heeft aangegeven niet deel te nemen. Wijzigt uw situatie, klik dan op «Ik wens deel te nemen».
              </p>
            </div>
          ) : null}

          {showRegister ? (
            <div className="nieuw-panel" ref={registerRef} id="inschrijven-tryout-modeshow">
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--n-ink)', fontSize: 15 }}>
                Inschrijven try-out modeshow
              </p>

              {paid ? (
                <p style={{ margin: '12px 0 0', color: 'var(--n-mut)', fontSize: 13, lineHeight: 1.6 }}>
                  U bent ingeschreven
                  {regView.isFree || Number(regView.amount ?? '0') === 0
                    ? ' (gratis / coupon)'
                    : ' en betaald'}{' '}
                  voor deze try-out modeshow. U ontvangt een bevestiging per e-mail.
                </p>
              ) : interested && !hasTerms ? (
                <div style={{ marginTop: 14, display: 'grid', gap: 14 }}>
                  <p style={{ margin: 0, color: 'var(--n-mut)', fontSize: 13, lineHeight: 1.6 }}>
                    Lees de{' '}
                    <button
                      type="button"
                      onClick={() => setTermsOpen(true)}
                      style={{
                        background: 'none',
                        border: 0,
                        padding: 0,
                        color: 'var(--n-gold)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        font: 'inherit',
                      }}
                    >
                      algemene voorwaarden
                    </button>{' '}
                    en ga akkoord. Vink hieronder aan en ga daarna verder naar afrekenen.
                  </p>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      cursor: 'pointer',
                      color: 'var(--n-ink)',
                      fontSize: 13,
                      lineHeight: 1.55,
                    }}
                  >
                    <input
                      type="checkbox"
                      style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }}
                      checked={termsTick}
                      onChange={(ev) => {
                        const v = ev.target.checked;
                        setTermsTick(v);
                        if (v) setTermsOpen(true);
                      }}
                    />
                    <span>
                      Ik ga akkoord met de algemene voorwaarden van Class-Models en bevestig dat de gegevens van mijn
                      account gebruikt mogen worden voor deze inschrijving.
                    </span>
                  </label>
                  {termsTick ? (
                    <p
                      style={{
                        margin: 0,
                        border: '1px solid rgba(52, 211, 153, 0.35)',
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#a7f3d0',
                        padding: '10px 12px',
                        fontSize: 12,
                      }}
                    >
                      Je hebt de algemene voorwaarden gelezen en geaccepteerd.
                    </p>
                  ) : null}
                  <CouponBlock
                    couponDraft={couponDraft}
                    setCouponDraft={setCouponDraft}
                    couponPreview={couponPreview}
                    setCouponPreview={setCouponPreview}
                    applyCoupon={() => void applyCoupon()}
                    busy={busy}
                    listPriceLabel={formatPrice(state.pricing.amount)}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <button
                      type="button"
                      className="nieuw-btn"
                      disabled={busy || !termsTick || !canPay}
                      onClick={() => void goToCheckout()}
                    >
                      {busy
                        ? 'Bezig…'
                        : couponPreview?.isFree
                          ? 'Gratis inschrijven'
                          : `Verder naar afrekenen (${priceLabel})`}
                    </button>
                    {!canPay ? (
                      <span style={{ alignSelf: 'center', fontSize: 12, color: 'var(--n-mut)' }}>
                        Betalen is niet beschikbaar op dit account.
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : interested && hasTerms ? (
                <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
                  <p style={{ margin: 0, color: 'var(--n-mut)', fontSize: 13, lineHeight: 1.6 }}>
                    Voorwaarden geaccepteerd
                    {regView.termsAcceptedAt
                      ? ` op ${new Intl.DateTimeFormat('nl-BE', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }).format(new Date(regView.termsAcceptedAt))}`
                      : ''}
                    . Rond de inschrijving af
                    {couponPreview?.isFree
                      ? ' met je couponcode (gratis).'
                      : ` met betaling van ${priceLabel} via Mollie.`}
                  </p>
                  <CouponBlock
                    couponDraft={couponDraft}
                    setCouponDraft={setCouponDraft}
                    couponPreview={couponPreview}
                    setCouponPreview={setCouponPreview}
                    applyCoupon={() => void applyCoupon()}
                    busy={busy}
                    listPriceLabel={formatPrice(state.pricing.amount)}
                  />
                  {regView.paymentStatus && regView.paymentStatus !== 'paid' && regView.paymentStatus !== 'free' ? (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--n-mut)' }}>
                      Betalingsstatus: <strong style={{ color: 'var(--n-ink)' }}>{regView.paymentStatus}</strong>
                    </p>
                  ) : null}
                  {canPay ? (
                    <div>
                      <button
                        type="button"
                        className="nieuw-btn"
                        disabled={busy}
                        onClick={() => void checkout()}
                      >
                        {busy
                          ? 'Bezig…'
                          : couponPreview?.isFree
                            ? 'Gratis inschrijven'
                            : `Afrekenen met Mollie (${priceLabel})`}
                      </button>
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--n-mut)' }}>
                      Betalen is niet beschikbaar op dit account. Neem contact op met Class-Models.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      {termsOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.72)' }}
        >
          <div
            className="w-full max-w-3xl overflow-hidden shadow-xl"
            style={{
              background: 'var(--n-bg-2)',
              border: '1px solid var(--n-hair)',
              borderRadius: 'var(--n-radius)',
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ background: 'var(--n-gold)', color: '#1a140c' }}
            >
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Algemene voorwaarden
              </p>
              <button
                type="button"
                onClick={() => setTermsOpen(false)}
                className="nieuw-btn nieuw-btn-ghost"
                style={{ padding: '6px 12px', fontSize: 11, color: '#1a140c', borderColor: 'rgba(0,0,0,0.25)' }}
              >
                Sluiten
              </button>
            </div>
            <div
              className="max-h-[65vh] overflow-auto px-4 py-4 text-sm"
              style={{ color: 'var(--n-mut)', lineHeight: 1.55 }}
            >
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--n-ink)' }}>Artikel 1 – Inschrijving en Deelname</p>
              <p style={{ margin: '8px 0 0' }}>
                1.1 Door inschrijving voor de Try-Out Modeshow verklaart het model zich akkoord met deze algemene
                voorwaarden.
              </p>
              <p style={{ margin: '6px 0 0' }}>
                1.2 Deelname aan de Try-Out Modeshow is geheel vrijwillig. Na inschrijving en akkoordverklaring met
                deze voorwaarden is deelname verplicht.
              </p>
              <p style={{ margin: '6px 0 0' }}>
                1.3 De deelnamekost bedraagt <strong style={{ color: 'var(--n-ink)' }}>{priceLabel}</strong>. Hiervoor
                ontvangt het model <strong style={{ color: 'var(--n-ink)' }}>30 inkomkaarten</strong> voor het
                evenement, welke vrij mogen worden verdeeld of verkocht.
              </p>

              <p style={{ margin: '16px 0 0', fontWeight: 600, color: 'var(--n-ink)' }}>
                Artikel 2 – Annulering en Terugbetaling
              </p>
              <p style={{ margin: '8px 0 0' }}>
                2.1 Bij annulering van deelname door het model, vindt geen restitutie van het inschrijfgeld plaats.
              </p>
              <p style={{ margin: '6px 0 0' }}>
                2.2 Bij annulering zonder aantoonbare overmacht wordt het model uit het bestand van Class-Models
                verwijderd en uitgesloten van toekomstige opdrachten.
              </p>
              <p style={{ margin: '6px 0 0' }}>
                2.3 Indien de Try-Out Modeshow door overmacht aan de zijde van Class-Models niet kan doorgaan én niet
                kan worden verplaatst naar een andere datum, zal het door het model betaalde bedrag volledig worden
                terugbetaald.
              </p>
              <p style={{ margin: '6px 0 0' }}>2.4 In alle andere gevallen is restitutie van het inschrijfgeld uitgesloten.</p>

              <p style={{ margin: '16px 0 0', fontWeight: 600, color: 'var(--n-ink)' }}>
                Artikel 3 – Verplichtingen van het Model
              </p>
              <p style={{ margin: '8px 0 0' }}>
                3.1 Het model verbindt zich ertoe deel te nemen aan drie oefenlessen in aanloop naar de Try-Out
                Modeshow.
              </p>
              <p style={{ margin: '6px 0 0' }}>
                3.2 Het model dient op de afgesproken dagen en tijden kleding te passen bij de deelnemende zaken.
              </p>
              <p style={{ margin: '6px 0 0' }}>
                3.3 Op de dag van de Try-Out Modeshow heeft het model recht op visagie, haarstyling, de aanmaak van
                setcards, foto’s en een volledige filmopname van de show.
              </p>

              <p style={{ margin: '16px 0 0', fontWeight: 600, color: 'var(--n-ink)' }}>
                Artikel 4 – Gedragscode en Vertrouwelijkheid
              </p>
              <p style={{ margin: '8px 0 0' }}>
                4.1 Het model dient zich te allen tijde professioneel, respectvol en positief op te stellen tegenover
                de organisatie, andere modellen, klanten en betrokkenen.
              </p>
              <p style={{ margin: '6px 0 0' }}>
                4.2 Negatief gedrag, roddelen, het verspreiden van negatieve opmerkingen over de organisatie, andere
                modellen of klanten, evenals het aanzetten tot negativiteit, leidt tot onmiddellijke uitsluiting van
                de Try-Out Modeshow en verwijdering uit het bestand van Class-Models.
              </p>
              <p style={{ margin: '6px 0 0' }}>
                4.3 Opmerkingen, klachten of suggesties kunnen altijd rechtstreeks bij de directie worden gemeld.
              </p>
              <p style={{ margin: '6px 0 0' }}>
                4.4 Modellen die getuige zijn van negatief gedrag of negatieve uitlatingen van andere modellen, zijn
                verplicht dit te melden aan de directie. Indien zij dit nalaten, worden zij als medeplichtig
                beschouwd en kunnen ook zij worden uitgesloten.
              </p>
              <p style={{ margin: '6px 0 0' }}>
                4.5 Het is het model niet toegestaan interne informatie van Class-Models of persoonlijke gegevens van
                zichzelf aan klanten te verstrekken.
              </p>
              <p style={{ margin: '6px 0 0' }}>
                4.6 Het model is verboden om, na bemiddeling door Class-Models, zelfstandig en zonder tussenkomst van
                Class-Models opdrachten voor klanten uit te voeren, zowel betaald als onbetaald. Overtreding hiervan
                leidt tot een schadevergoeding ten gunste van Class-Models.
              </p>

              <p style={{ margin: '16px 0 0', fontWeight: 600, color: 'var(--n-ink)' }}>
                Artikel 5 – Samenwerking met Klanten (Kledingzaken)
              </p>
              <p style={{ margin: '8px 0 0' }}>
                5.1 De klanten (kledingzaken) ontvangen een lijst van alle modellen die bij hen komen passen. Zij
                vullen voor elk model een evaluatieformulier in, dat door Class-Models wordt geëvalueerd.
              </p>
              <p style={{ margin: '6px 0 0' }}>5.2 Het model dient altijd stipt op tijd aanwezig te zijn bij afspraken met klanten.</p>
              <p style={{ margin: '6px 0 0' }}>
                5.3 De hygiëne van het model dient optimaal te zijn bij elk bezoek aan klanten:
                <br />• Haren verzorgd en schoon
                <br />• Propere, nette kleding en schoeisel
                <br />• Indien mogelijk licht opgemaakt
                <br />• Een vriendelijke, representatieve houding
              </p>
              <p style={{ margin: '6px 0 0' }}>
                5.4 Het model dient de kleding te dragen die door de winkel is uitgekozen voor de modeshow. Discussie
                hierover is niet toegestaan.
              </p>
              <p style={{ margin: '6px 0 0' }}>
                5.5 Een goede eerste indruk is essentieel; het model dient zich hiernaar te gedragen.
              </p>

              <p style={{ margin: '16px 0 0', fontWeight: 600, color: 'var(--n-ink)' }}>
                Artikel 6 – Uitsluiting en Sancties
              </p>
              <p style={{ margin: '8px 0 0' }}>
                6.1 Ongepast gedrag, het niet naleven van deze voorwaarden of het niet melden van negatieve
                uitlatingen kan leiden tot onmiddellijke uitsluiting van deelname, zonder recht op compensatie.
              </p>
              <p style={{ margin: '6px 0 0' }}>6.2 Het model wordt bij uitsluiting per e-mail op de hoogte gesteld.</p>

              <p style={{ margin: '16px 0 0', fontWeight: 600, color: 'var(--n-ink)' }}>Artikel 7 – Overige Bepalingen</p>
              <p style={{ margin: '8px 0 0' }}>7.1 In alle gevallen waarin deze voorwaarden niet voorzien, beslist Class-Models.</p>
              <p style={{ margin: '6px 0 0' }}>
                7.2 Door inschrijving verklaart het model deze algemene voorwaarden te hebben gelezen, begrepen en
                hiermee akkoord te gaan.
              </p>
            </div>
            <div
              className="flex flex-wrap justify-end gap-2 px-4 py-3"
              style={{ borderTop: '1px solid var(--n-hair)', background: 'var(--n-bg-3)' }}
            >
              <button
                type="button"
                className="nieuw-btn nieuw-btn-ghost"
                onClick={() => {
                  setTermsTick(false);
                  setTermsOpen(false);
                }}
              >
                Niet akkoord
              </button>
              <button
                type="button"
                className="nieuw-btn"
                onClick={() => {
                  setTermsTick(true);
                  setTermsOpen(false);
                }}
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

function CouponBlock({
  couponDraft,
  setCouponDraft,
  couponPreview,
  setCouponPreview,
  applyCoupon,
  busy,
  listPriceLabel,
}: {
  couponDraft: string;
  setCouponDraft: (v: string) => void;
  couponPreview: CouponPreview | null;
  setCouponPreview: (v: CouponPreview | null) => void;
  applyCoupon: () => void;
  busy: boolean;
  listPriceLabel: string;
}) {
  return (
    <div
      style={{
        borderTop: '1px solid var(--n-hair)',
        paddingTop: 12,
        display: 'grid',
        gap: 8,
      }}
    >
      <p style={{ margin: 0, fontSize: 12, color: 'var(--n-mut)' }}>
        Couponcode (optioneel) — standaardprijs {listPriceLabel}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <input
          value={couponDraft}
          onChange={(e) => {
            setCouponDraft(e.target.value.toUpperCase());
            setCouponPreview(null);
          }}
          placeholder="CODE"
          disabled={busy}
          style={{
            minWidth: 140,
            flex: '1 1 140px',
            background: 'var(--n-bg-3)',
            border: '1px solid var(--n-hair)',
            color: 'var(--n-ink)',
            padding: '8px 10px',
            fontSize: 13,
            letterSpacing: '0.06em',
          }}
        />
        <button type="button" className="nieuw-btn nieuw-btn-ghost" disabled={busy} onClick={applyCoupon}>
          Toepassen
        </button>
      </div>
      {couponPreview ? (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--n-gold)' }}>
          Code <strong>{couponPreview.code}</strong>: −{formatPrice(couponPreview.discountAmount)} →{' '}
          <strong style={{ color: 'var(--n-ink)' }}>
            {couponPreview.isFree ? 'Gratis' : formatPrice(couponPreview.finalAmount)}
          </strong>
        </p>
      ) : null}
    </div>
  );
}
