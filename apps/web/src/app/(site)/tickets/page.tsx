'use client';

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { useAuth } from '@/context/auth-context';

type PublicEvent = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  eventDate: string;
  eventDateLabel: string;
  doorsTime: string | null;
  startTime: string | null;
  addressLabel: string;
  priceStd: number;
  priceVip: number;
  remaining: number | null;
  soldOut: boolean;
  hasStd: boolean;
  hasVip: boolean;
};

function eur(n: number) {
  return `€ ${n.toFixed(2).replace('.', ',')}`;
}

export default function TicketsModeshowPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qtyStd, setQtyStd] = useState(1);
  const [qtyVip, setQtyVip] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    streetNo: '',
    postcode: '',
    city: '',
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) router.replace('/');
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await apiFetch<PublicEvent[]>('/modeshow-tickets/events');
        if (cancelled) return;
        setEvents(rows);
        if (rows[0]) setSelectedId(rows[0].id);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Laden mislukt');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAdmin]);

  const selected = useMemo(
    () => events.find((e) => e.id === selectedId) ?? null,
    [events, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    setQtyStd(selected.hasStd ? 1 : 0);
    setQtyVip(0);
  }, [selected?.id]);

  const subtotal = useMemo(() => {
    if (!selected) return 0;
    return qtyStd * selected.priceStd + qtyVip * selected.priceVip;
  }, [selected, qtyStd, qtyVip]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setErr('');
    try {
      const res = await apiFetch<{
        checkoutUrl?: string;
        skipCheckout?: boolean;
        thanksUrl?: string;
        freeOrder?: boolean;
      }>('/modeshow-tickets/checkout', {
        method: 'POST',
        body: JSON.stringify({
          eventId: selected.id,
          qtyStd,
          qtyVip,
          couponCode: couponCode.trim() || undefined,
          ...form,
          returnOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
        }),
      });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      if (res.thanksUrl) {
        window.location.href = res.thanksUrl;
        return;
      }
      throw new Error('Geen betaallink ontvangen');
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Bestelling mislukt');
      setBusy(false);
    }
  }

  if (authLoading || !isAdmin) {
    return (
      <NieuwShell portal="gasten">
        <div className="nieuw-wrap" style={{ paddingTop: 48, color: '#857f74' }}>
          Laden…
        </div>
      </NieuwShell>
    );
  }

  return (
    <NieuwShell portal="gasten">
      <div className="nieuw-wrap" style={{ paddingTop: 36, paddingBottom: 72 }}>
        <header style={{ maxWidth: 720, marginBottom: 36 }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#856b3f',
              fontWeight: 700,
            }}
          >
            Tickets · alleen admin (tijdelijk)
          </p>
          <h1
            style={{
              margin: '10px 0 12px',
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 600,
              color: '#191919',
              lineHeight: 1.15,
            }}
          >
            Tickets modeshow
          </h1>
          <p style={{ margin: 0, color: '#525049', fontSize: 16, lineHeight: 1.65, maxWidth: '42ch' }}>
            Koop je toegangskaarten veilig online. Na betaling ontvang je je tickets met QR-code per e-mail.
          </p>
        </header>

        {loading ? <p style={{ color: '#857f74' }}>Evenementen laden…</p> : null}
        {err ? (
          <p
            style={{
              color: '#8b1e1e',
              background: '#faf4f4',
              border: '1px solid #e8d0d0',
              padding: '12px 14px',
              marginBottom: 20,
            }}
          >
            {err}
          </p>
        ) : null}

        {!loading && !events.length ? (
          <p style={{ color: '#525049' }}>Er zijn momenteel geen modeshows met ticketverkoop.</p>
        ) : null}

        <div className="cm-tickets-grid">
          <section style={{ display: 'grid', gap: 14 }}>
            {events.map((ev) => {
              const active = ev.id === selectedId;
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setSelectedId(ev.id)}
                  style={{
                    textAlign: 'left',
                    border: active ? '1px solid #c2a164' : '1px solid #ddd6c8',
                    background: active ? '#faf7f0' : '#fff',
                    padding: '18px 20px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#191919', fontWeight: 600 }}>
                    {ev.title}
                  </div>
                  <div style={{ marginTop: 8, color: '#856b3f', fontSize: 13, fontWeight: 600 }}>
                    {ev.eventDateLabel}
                    {ev.doorsTime ? ` · Deuren ${ev.doorsTime.slice(0, 5)}` : ''}
                    {ev.startTime ? ` · Start ${ev.startTime.slice(0, 5)}` : ''}
                  </div>
                  {ev.addressLabel ? (
                    <div style={{ marginTop: 6, color: '#525049', fontSize: 14 }}>{ev.addressLabel}</div>
                  ) : null}
                  {ev.summary ? (
                    <div style={{ marginTop: 10, color: '#3f3c37', fontSize: 14, lineHeight: 1.55 }}>
                      {ev.summary}
                    </div>
                  ) : null}
                  <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
                    {ev.hasStd ? <span>Standaard {eur(ev.priceStd)}</span> : null}
                    {ev.hasVip ? <span>VIP {eur(ev.priceVip)}</span> : null}
                    {ev.soldOut ? (
                      <span style={{ color: '#8b1e1e', fontWeight: 700 }}>Uitverkocht</span>
                    ) : ev.remaining != null ? (
                      <span style={{ color: '#857f74' }}>Nog {ev.remaining}</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </section>

          <section
            style={{
              border: '1px solid #c2a164',
              background: '#fff',
              padding: '22px 22px 26px',
              position: 'sticky',
              top: 24,
            }}
          >
            <h2
              style={{
                margin: '0 0 16px',
                fontFamily: 'Georgia, serif',
                fontSize: 22,
                color: '#191919',
              }}
            >
              Bestellen
            </h2>
            {!selected ? (
              <p style={{ color: '#857f74' }}>Kies een evenement.</p>
            ) : selected.soldOut ? (
              <p style={{ color: '#8b1e1e' }}>Dit evenement is uitverkocht.</p>
            ) : (
              <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
                {selected.hasStd ? (
                  <label style={{ display: 'grid', gap: 4, fontSize: 13, color: '#525049' }}>
                    Standaardticket ({eur(selected.priceStd)})
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={qtyStd}
                      onChange={(e) => setQtyStd(Math.max(0, Number(e.target.value) || 0))}
                      style={inputStyle}
                    />
                  </label>
                ) : null}
                {selected.hasVip ? (
                  <label style={{ display: 'grid', gap: 4, fontSize: 13, color: '#525049' }}>
                    VIP-ticket ({eur(selected.priceVip)})
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={qtyVip}
                      onChange={(e) => setQtyVip(Math.max(0, Number(e.target.value) || 0))}
                      style={inputStyle}
                    />
                  </label>
                ) : null}
                <label style={{ display: 'grid', gap: 4, fontSize: 13, color: '#525049' }}>
                  Couponcode (optioneel)
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    style={inputStyle}
                    placeholder="bv. VIP1"
                  />
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                  }}
                >
                  {(
                    [
                      ['firstName', 'Voornaam'],
                      ['lastName', 'Naam'],
                      ['email', 'E-mail'],
                      ['phone', 'Telefoon'],
                      ['street', 'Straat'],
                      ['streetNo', 'Nr.'],
                      ['postcode', 'Postcode'],
                      ['city', 'Gemeente'],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      style={{
                        display: 'grid',
                        gap: 4,
                        fontSize: 13,
                        color: '#525049',
                        gridColumn: key === 'email' || key === 'street' ? '1 / -1' : undefined,
                      }}
                    >
                      {label}
                      <input
                        required={key === 'firstName' || key === 'lastName' || key === 'email'}
                        type={key === 'email' ? 'email' : 'text'}
                        value={form[key]}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        style={inputStyle}
                      />
                    </label>
                  ))}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginTop: 4,
                    paddingTop: 12,
                    borderTop: '1px solid #e8e2d6',
                  }}
                >
                  <span style={{ color: '#857f74', fontSize: 13 }}>Subtotaal (vóór coupon)</span>
                  <strong style={{ fontSize: 18, color: '#191919' }}>{eur(subtotal)}</strong>
                </div>
                <button
                  type="submit"
                  disabled={busy || qtyStd + qtyVip < 1}
                  style={{
                    marginTop: 8,
                    border: '1px solid #c2a164',
                    background: '#c2a164',
                    color: '#191919',
                    fontWeight: 700,
                    padding: '14px 18px',
                    cursor: busy ? 'wait' : 'pointer',
                    fontSize: 14,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {busy ? 'Bezig…' : 'Betalen met Mollie'}
                </button>
                <p style={{ margin: 0, fontSize: 12, color: '#857f74', lineHeight: 1.5 }}>
                  Veilig betalen via Mollie. Tickets worden na betaling per e-mail bezorgd (PDF met QR).
                </p>
              </form>
            )}
          </section>
        </div>
      </div>
    </NieuwShell>
  );
}

const inputStyle: CSSProperties = {
  border: '1px solid #d8d1c4',
  background: '#fff',
  padding: '10px 12px',
  fontSize: 15,
  color: '#191919',
  width: '100%',
};
