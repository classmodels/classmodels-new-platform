'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { apiFetch } from '@/lib/api';
import { portalTitlebarPillClass } from '@/components/model-portal/portal-titlebar-pill';
import { TryoutModeshowInfoContent } from '@/components/model-portal/tryout-modeshow-info-content';
import { TryoutTermsContent } from '@/components/model-portal/tryout-terms-content';
import { createPortal } from 'react-dom';
import { goToExternalCheckout } from '@/lib/storage';

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
    declineReason?: string | null;
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
  const [termsRequiredOpen, setTermsRequiredOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>('summary');
  const [couponDraft, setCouponDraft] = useState('');
  const [couponPreview, setCouponPreview] = useState<CouponPreview | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
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
    async (interested: boolean, reason?: string) => {
      if (!token) return;
      setBusy(true);
      setErr(null);
      try {
        const s = await apiFetch<TryoutState>('/portal/model/tryout-modeshow/interest', {
          method: 'POST',
          token,
          body: JSON.stringify({
            interested,
            ...(interested ? {} : { declineReason: reason?.trim() || undefined }),
          }),
        });
        setState(s);
        setPanel('summary');
        setDeclineOpen(false);
        setDeclineReason('');
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
        goToExternalCheckout(res.checkoutUrl);
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
      setTermsRequiredOpen(true);
      return;
    }
    setBusy(true);
    setErr(null);
    setTermsRequiredOpen(false);
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
        goToExternalCheckout(res.checkoutUrl);
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
  const paymentLabelNl =
    paid || reg?.paymentStatus === 'paid' || reg?.paymentStatus === 'free'
      ? 'Betaald'
      : interested && hasTerms
        ? 'Niet betaald'
        : null;

  const attemptCheckout = useCallback(() => {
    if (!termsTick && !hasTerms) {
      setTermsRequiredOpen(true);
      return;
    }
    void goToCheckout();
  }, [termsTick, hasTerms, goToCheckout]);

  const attemptPay = useCallback(() => {
    if (!termsTick && !hasTerms) {
      setTermsRequiredOpen(true);
      return;
    }
    void checkout();
  }, [termsTick, hasTerms, checkout]);

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
        headerBtn('Ik wens niet deel te nemen', () => setDeclineOpen(true), { variant: 'decline' }),
      );
    } else if (interested) {
      buttons.push(
        headerBtn('Ik wens niet deel te nemen', () => setDeclineOpen(true), { variant: 'decline' }),
        !hasTerms
          ? headerBtn('Akkoord — verder naar afrekenen', () => attemptCheckout(), { variant: 'primary' })
          : canPay
            ? headerBtn(
                busy ? 'Bezig…' : couponPreview?.isFree ? 'Gratis inschrijven' : `Afrekenen (${priceLabel})`,
                () => attemptPay(),
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
    attemptCheckout,
    attemptPay,
    busy,
    canBriefs,
    canPay,
    couponPreview?.isFree,
    declined,
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
                U heeft aangegeven niet deel te nemen
                {reg?.declineReason ? (
                  <>
                    {' '}
                    (<em style={{ color: 'var(--n-ink)' }}>{reg.declineReason}</em>)
                  </>
                ) : null}
                . Bent u van gedacht veranderd, dan kunt u nog steeds deelnemen — zolang er nog plaats is. Gebruik
                daarvoor de knop «Ik wens deel te nemen».
              </p>
            </div>
          ) : null}

          {showRegister ? (
            <div className="nieuw-panel" ref={registerRef} id="inschrijven-tryout-modeshow">
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--n-ink)', fontSize: 15 }}>
                Inschrijven try-out modeshow
              </p>

              {paid ? (
                <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                  <p style={{ margin: 0, color: 'var(--n-mut)', fontSize: 13, lineHeight: 1.6 }}>
                    U bent ingeschreven voor de try-out modeshow. Class-Models houdt u op de hoogte van de verdere
                    afhandelingen.
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--n-gold)' }}>
                    Status: <strong style={{ color: 'var(--n-ink)' }}>Betaald</strong>
                    {regView.isFree || Number(regView.amount ?? '0') === 0 ? ' (gratis / coupon)' : null}
                  </p>
                </div>
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
                    en ga akkoord in de popup. Daarna kunt u verder naar afrekenen.
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
                        // Alleen uitvinken mag direct; aanvinken gebeurt via Akkoord in de popup.
                        if (!ev.target.checked) {
                          setTermsTick(false);
                          return;
                        }
                        ev.preventDefault();
                        setTermsOpen(true);
                      }}
                      onClick={(ev) => {
                        if (!termsTick) {
                          ev.preventDefault();
                          setTermsOpen(true);
                        }
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
                      disabled={busy || !canPay}
                      onClick={() => attemptCheckout()}
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
                  {paymentLabelNl ? (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--n-mut)' }}>
                      Status:{' '}
                      <strong style={{ color: 'var(--n-ink)' }}>{paymentLabelNl}</strong>
                    </p>
                  ) : null}
                  {canPay ? (
                    <div>
                      <button
                        type="button"
                        className="nieuw-btn"
                        disabled={busy}
                        onClick={() => attemptPay()}
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

      {typeof document !== 'undefined' && declineOpen
        ? createPortal(
            <div className="nieuw-root" style={{ position: 'fixed', inset: 0, zIndex: 100000 }}>
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="tryout-decline-title"
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 16,
                  background: 'rgba(8, 8, 11, 0.72)',
                  boxSizing: 'border-box',
                }}
                onClick={(ev) => {
                  if (ev.target === ev.currentTarget) setDeclineOpen(false);
                }}
              >
                <div
                  style={{
                    width: 'min(440px, 100%)',
                    background: '#16161e',
                    border: '1px solid rgba(212, 175, 106, 0.45)',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '12px 14px',
                      borderBottom: '1px solid rgba(243, 238, 230, 0.12)',
                      background: '#101016',
                    }}
                  >
                    <p
                      id="tryout-decline-title"
                      style={{
                        margin: 0,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: '#d4af6a',
                      }}
                    >
                      Niet deelnemen
                    </p>
                    <button
                      type="button"
                      aria-label="Sluiten"
                      onClick={() => setDeclineOpen(false)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 4,
                        border: '1px solid rgba(243, 238, 230, 0.25)',
                        background: 'transparent',
                        color: '#f3eee6',
                        fontSize: 18,
                        lineHeight: 1,
                        cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ padding: '16px', display: 'grid', gap: 10 }}>
                    <p style={{ margin: 0, color: '#9e9689', fontSize: 13, lineHeight: 1.55 }}>
                      Geef kort aan waarom u niet wilt deelnemen. Dit helpt Class-Models bij de organisatie.
                    </p>
                    <textarea
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value.slice(0, 500))}
                      rows={4}
                      placeholder="Bv. planning, studie, andere reden…"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        background: '#101016',
                        border: '1px solid rgba(243, 238, 230, 0.18)',
                        color: '#f3eee6',
                        padding: '10px 12px',
                        fontSize: 13,
                        resize: 'vertical',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                      gap: 8,
                      padding: '12px 14px',
                      borderTop: '1px solid rgba(243, 238, 230, 0.12)',
                      background: '#101016',
                    }}
                  >
                    <button
                      type="button"
                      className="nieuw-btn nieuw-btn-ghost"
                      onClick={() => setDeclineOpen(false)}
                    >
                      Annuleren
                    </button>
                    <button
                      type="button"
                      className="nieuw-btn"
                      disabled={busy || !declineReason.trim()}
                      onClick={() => void interest(false, declineReason)}
                      style={{ background: '#c43c3c', borderColor: '#a83232', color: '#fff' }}
                    >
                      Bevestigen
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {typeof document !== 'undefined' && termsRequiredOpen
        ? createPortal(
            <div className="nieuw-root" style={{ position: 'fixed', inset: 0, zIndex: 100000 }}>
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="tryout-terms-required-title"
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 16,
                  background: 'rgba(8, 8, 11, 0.72)',
                  boxSizing: 'border-box',
                }}
                onClick={(ev) => {
                  if (ev.target === ev.currentTarget) setTermsRequiredOpen(false);
                }}
              >
                <div
                  style={{
                    width: 'min(420px, 100%)',
                    background: '#16161e',
                    border: '1px solid rgba(212, 175, 106, 0.45)',
                    borderRadius: 4,
                    boxShadow: '0 18px 50px rgba(0,0,0,0.65)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '12px 14px',
                      borderBottom: '1px solid rgba(243, 238, 230, 0.12)',
                      background: '#101016',
                    }}
                  >
                    <p
                      id="tryout-terms-required-title"
                      style={{
                        margin: 0,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: '#d4af6a',
                      }}
                    >
                      Voorwaarden vereist
                    </p>
                    <button
                      type="button"
                      aria-label="Sluiten"
                      onClick={() => setTermsRequiredOpen(false)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 4,
                        border: '1px solid rgba(243, 238, 230, 0.25)',
                        background: 'transparent',
                        color: '#f3eee6',
                        fontSize: 18,
                        lineHeight: 1,
                        cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ padding: '18px 16px', color: '#9e9689', fontSize: 13, lineHeight: 1.55 }}>
                    <p style={{ margin: 0, color: '#f3eee6' }}>
                      U moet eerst de algemene voorwaarden accepteren voor u verder kunt gaan naar de betaling.
                    </p>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                      gap: 8,
                      padding: '12px 14px',
                      borderTop: '1px solid rgba(243, 238, 230, 0.12)',
                      background: '#101016',
                    }}
                  >
                    <button
                      type="button"
                      className="nieuw-btn nieuw-btn-ghost"
                      onClick={() => setTermsRequiredOpen(false)}
                    >
                      Sluiten
                    </button>
                    <button
                      type="button"
                      className="nieuw-btn"
                      onClick={() => {
                        setTermsRequiredOpen(false);
                        setTermsOpen(true);
                      }}
                    >
                      Voorwaarden lezen
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {typeof document !== 'undefined' && termsOpen
        ? createPortal(
            <div className="nieuw-root" style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="tryout-terms-title"
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 16,
                  background: 'rgba(8, 8, 11, 0.78)',
                  boxSizing: 'border-box',
                }}
                onClick={(ev) => {
                  if (ev.target === ev.currentTarget) setTermsOpen(false);
                }}
              >
                <div
                  style={{
                    width: 'min(720px, 100%)',
                    maxHeight: 'min(88vh, 860px)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    background: '#16161e',
                    border: '1px solid rgba(212, 175, 106, 0.38)',
                    borderRadius: 4,
                    boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '12px 14px',
                      background: '#d4af6a',
                      color: '#1a140c',
                      flexShrink: 0,
                    }}
                  >
                    <p
                      id="tryout-terms-title"
                      style={{
                        margin: 0,
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Algemene voorwaarden
                    </p>
                    <button
                      type="button"
                      aria-label="Sluiten"
                      onClick={() => setTermsOpen(false)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 4,
                        border: '1px solid rgba(0,0,0,0.25)',
                        background: 'rgba(255,255,255,0.25)',
                        color: '#1a140c',
                        fontSize: 18,
                        lineHeight: 1,
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      ×
                    </button>
                  </div>

                  <div
                    style={{
                      flex: '1 1 auto',
                      minHeight: 0,
                      overflow: 'auto',
                      padding: '8px 16px 16px',
                      background: '#16161e',
                      WebkitOverflowScrolling: 'touch',
                    }}
                  >
                    <TryoutTermsContent priceLabel={formatPrice(state.pricing.amount)} />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                      gap: 8,
                      padding: '12px 14px',
                      borderTop: '1px solid rgba(243, 238, 230, 0.12)',
                      background: '#101016',
                      flexShrink: 0,
                    }}
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
            </div>,
            document.body,
          )
        : null}
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
