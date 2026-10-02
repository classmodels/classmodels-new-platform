'use client';

import { FormEvent, Suspense, useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { NieuwShell } from '@/components/nieuw/NieuwShell';

type ClaimInfo = {
  code: string;
  ticketType: string;
  label: string | null;
  alreadyClaimed: boolean;
  claim: { firstName: string; lastName: string; email: string } | null;
  event: {
    id: string;
    title: string;
    eventDate: string;
    eventDateLabel: string;
    doorsTime: string | null;
    startTime: string | null;
    addressLabel: string;
    claimInfoText: string | null;
    priceDrinks: number;
    drinkTitle: string;
    hasDrinks: boolean;
    sponsorText: string | null;
    sponsorImageUrls: string[];
    slug: string;
  };
  buyer: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

type ClaimSubmitResult = {
  ok: boolean;
  claimId: string;
  event: ClaimInfo['event'];
  drinksShopUrl: string | null;
};

function ClaimPageInner() {
  const sp = useSearchParams();
  const code = (sp.get('code') || '').trim();

  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<ClaimSubmitResult | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (!code) {
      setLoading(false);
      setErr('Geen ticketcode in de link. Scan opnieuw de QR op je ticket.');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const row = await apiFetch<ClaimInfo>(
          `/modeshow-tickets/claim?code=${encodeURIComponent(code)}`,
        );
        if (cancelled) return;
        setInfo(row);
        setForm({
          firstName: row.claim?.firstName || row.buyer.firstName || '',
          lastName: row.claim?.lastName || row.buyer.lastName || '',
          email: row.claim?.email || row.buyer.email || '',
          phone: '',
        });
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Ticket laden mislukt');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code || info?.alreadyClaimed) return;
    setBusy(true);
    setErr('');
    try {
      const res = await apiFetch<ClaimSubmitResult>('/modeshow-tickets/claim', {
        method: 'POST',
        body: JSON.stringify({ code, ...form }),
      });
      setDone(res);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Registratie mislukt');
    } finally {
      setBusy(false);
    }
  }

  const event = done?.event ?? info?.event;
  const drinksHref =
    done?.drinksShopUrl ||
    (event?.hasDrinks ? `/tickets?event=${encodeURIComponent(event.slug)}&drinks=1` : null);

  return (
    <NieuwShell portal="gasten">
      <div className="nieuw-wrap" style={{ paddingTop: 36, paddingBottom: 72, maxWidth: 560 }}>
        <header style={{ marginBottom: 28 }}>
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
            Ticketregistratie
          </p>
          <h1
            style={{
              margin: '10px 0 0',
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)',
              fontWeight: 600,
              color: '#191919',
              lineHeight: 1.2,
            }}
          >
            Registreer je ticket
          </h1>
        </header>

        {loading ? <p style={{ color: '#857f74' }}>Ticket laden…</p> : null}

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

        {event ? (
          <div
            style={{
              border: '1px solid #ddd6c8',
              background: '#faf7f0',
              padding: '18px 20px',
              marginBottom: 24,
            }}
          >
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: '#191919', fontWeight: 600 }}>
              {event.title}
            </div>
            <div style={{ marginTop: 8, color: '#856b3f', fontSize: 13, fontWeight: 600 }}>
              {event.eventDateLabel}
              {event.doorsTime ? ` · Deuren ${event.doorsTime.slice(0, 5)}` : ''}
            </div>
            {event.addressLabel ? (
              <div style={{ marginTop: 6, color: '#525049', fontSize: 14 }}>{event.addressLabel}</div>
            ) : null}
            {event.claimInfoText ? (
              <p style={{ margin: '14px 0 0', color: '#525049', fontSize: 14, lineHeight: 1.6 }}>
                {event.claimInfoText}
              </p>
            ) : null}
            {code ? (
              <p style={{ margin: '12px 0 0', fontSize: 12, color: '#857f74' }}>
                Ticketcode: <code style={{ fontSize: 13 }}>{code.toUpperCase()}</code>
              </p>
            ) : null}
          </div>
        ) : null}

        {done ? (
          <div
            style={{
              border: '1px solid #c2a164',
              background: '#fff',
              padding: '22px 22px 26px',
            }}
          >
            <h2 style={{ margin: '0 0 12px', fontFamily: 'Georgia, serif', fontSize: 22, color: '#191919' }}>
              Bedankt!
            </h2>
            <p style={{ margin: 0, color: '#525049', lineHeight: 1.65 }}>
              Je ticket is geregistreerd. Toon bij aankomst je QR of ticketcode aan de ingang.
            </p>
            {drinksHref ? (
              <p style={{ marginTop: 20 }}>
                <Link
                  href={drinksHref}
                  style={{
                    display: 'inline-block',
                    border: '1px solid #c2a164',
                    background: '#c2a164',
                    color: '#191919',
                    fontWeight: 700,
                    padding: '12px 16px',
                    fontSize: 13,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                  }}
                >
                  {event?.drinkTitle ? `${event.drinkTitle} bestellen` : 'Drankbonnen bestellen'}
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}

        {!loading && info && !done && info.alreadyClaimed ? (
          <div
            style={{
              border: '1px solid #c2a164',
              background: '#fff',
              padding: '22px 22px 26px',
            }}
          >
            <h2 style={{ margin: '0 0 12px', fontFamily: 'Georgia, serif', fontSize: 22, color: '#191919' }}>
              Al geregistreerd
            </h2>
            <p style={{ margin: 0, color: '#525049', lineHeight: 1.65 }}>
              Dit ticket is al geregistreerd
              {info.claim ? (
                <>
                  {' '}
                  op naam van {info.claim.firstName} {info.claim.lastName}.
                </>
              ) : (
                '.'
              )}
            </p>
            {drinksHref ? (
              <p style={{ marginTop: 20 }}>
                <Link href={drinksHref} style={{ color: '#856b3f', fontWeight: 700 }}>
                  Naar drankbonnen
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}

        {!loading && info && !done && !info.alreadyClaimed ? (
          <form
            onSubmit={onSubmit}
            style={{
              border: '1px solid #c2a164',
              background: '#fff',
              padding: '22px 22px 26px',
              display: 'grid',
              gap: 12,
            }}
          >
            <h2 style={{ margin: '0 0 4px', fontFamily: 'Georgia, serif', fontSize: 22, color: '#191919' }}>
              Jouw gegevens
            </h2>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: '#857f74', lineHeight: 1.5 }}>
              Vul de gegevens in van de persoon die dit ticket gebruikt op de modeshow.
            </p>
            <label style={{ display: 'grid', gap: 4, fontSize: 13, color: '#525049' }}>
              Voornaam
              <input
                required
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 13, color: '#525049' }}>
              Naam
              <input
                required
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 13, color: '#525049' }}>
              E-mail
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 13, color: '#525049' }}>
              Telefoon (optioneel)
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                style={inputStyle}
              />
            </label>
            <button
              type="submit"
              disabled={busy}
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
              {busy ? 'Bezig…' : 'Registreren'}
            </button>
          </form>
        ) : null}
      </div>
    </NieuwShell>
  );
}

export default function TicketClaimPage() {
  return (
    <Suspense
      fallback={
        <NieuwShell portal="gasten">
          <div className="nieuw-wrap" style={{ paddingTop: 48, color: '#857f74' }}>
            Laden…
          </div>
        </NieuwShell>
      }
    >
      <ClaimPageInner />
    </Suspense>
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
