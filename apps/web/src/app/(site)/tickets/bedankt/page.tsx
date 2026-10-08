'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { NieuwShell } from '@/components/nieuw/NieuwShell';

type OrderStatus = {
  status: string;
  firstName: string;
  email: string;
  totalAmount: number;
  tickets: { code: string; ticketType: string; label?: string }[];
  event: { title: string; eventDate?: string | null } | null;
};

const MYZYNN_STATUS_BASE =
  process.env.NEXT_PUBLIC_MYZYNN_ORIGIN?.trim().replace(/\/$/, '') || 'https://myzynn.be';

async function fetchMyzynnOrder(orderKey: string): Promise<OrderStatus> {
  const res = await fetch(
    `${MYZYNN_STATUS_BASE}/api/events-tickets/orders/by-key/${encodeURIComponent(orderKey)}/status`,
    { credentials: 'omit' },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Status ophalen mislukt (${res.status})`);
  }
  return res.json() as Promise<OrderStatus>;
}

function BedanktInner() {
  const sp = useSearchParams();
  const orderKey = sp.get('order') || '';
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderKey) {
      setErr('Geen bestelling gevonden in de link.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    let tries = 0;
    const poll = async () => {
      try {
        let row: OrderStatus | null = null;
        try {
          row = await apiFetch<OrderStatus>(`/modeshow-tickets/orders/${encodeURIComponent(orderKey)}`);
        } catch {
          row = await fetchMyzynnOrder(orderKey);
        }
        if (cancelled || !row) return;
        setOrder(row);
        if (
          (row.status === 'pending_payment' || row.status === 'pending') &&
          tries < 8
        ) {
          tries += 1;
          setTimeout(poll, 2000);
          return;
        }
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : 'Status ophalen mislukt');
          setLoading(false);
        }
      }
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [orderKey]);

  const paid = order?.status === 'paid' || order?.status === 'free';
  const pending = loading || order?.status === 'pending_payment' || order?.status === 'pending';

  return (
    <NieuwShell portal="gasten">
      <div
        className="nieuw-wrap"
        style={{
          paddingTop: 48,
          paddingBottom: 80,
          maxWidth: 720,
          color: '#f3ead8',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#c2a164',
            fontWeight: 700,
          }}
        >
          Bestelling
        </p>
        <h1
          style={{
            margin: '10px 0 20px',
            fontFamily: 'Georgia, serif',
            fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
            color: '#f7f1e6',
            fontWeight: 600,
            lineHeight: 1.15,
          }}
        >
          {paid ? 'Bedankt voor je aankoop' : pending ? 'Betaling controleren…' : 'Bestellingstatus'}
        </h1>
        {err ? (
          <p
            style={{
              color: '#ffb4a8',
              background: 'rgba(139,30,30,0.25)',
              border: '1px solid rgba(255,140,120,0.35)',
              padding: '12px 14px',
              borderRadius: 8,
            }}
          >
            {err}
          </p>
        ) : null}
        {order ? (
          <div
            style={{
              border: '1px solid rgba(194,161,100,0.55)',
              padding: 22,
              background: 'linear-gradient(165deg, rgba(34,28,21,0.95), rgba(18,15,12,0.98))',
              borderRadius: 10,
              boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
            }}
          >
            <p style={{ margin: '0 0 8px', color: 'rgba(243,234,216,0.72)' }}>
              Status:{' '}
              <strong style={{ color: paid ? '#b8e0a8' : '#f7f1e6' }}>
                {paid ? 'Betaald' : order.status}
              </strong>
            </p>
            {order.event ? (
              <p
                style={{
                  margin: '0 0 8px',
                  color: '#f7f1e6',
                  fontFamily: 'Georgia, serif',
                  fontSize: 22,
                }}
              >
                {order.event.title}
              </p>
            ) : null}
            <p style={{ margin: '0 0 8px', color: 'rgba(243,234,216,0.78)' }}>
              {order.firstName} · {order.email}
            </p>
            <p style={{ margin: '0 0 16px', color: 'rgba(243,234,216,0.78)' }}>
              Totaal € {Number(order.totalAmount).toFixed(2).replace('.', ',')} · {order.tickets.length}{' '}
              ticket(s)
            </p>
            {paid ? (
              <p style={{ margin: 0, color: 'rgba(243,234,216,0.88)', lineHeight: 1.65 }}>
                Je tickets met QR-code zijn per e-mail verstuurd (controleer ook je spamfolder). Bewaar
                de PDF of toon de QR aan de ingang.
              </p>
            ) : (
              <p style={{ margin: 0, color: 'rgba(243,234,216,0.65)' }}>
                Als je net betaald hebt, kan de bevestiging even duren. Ververs deze pagina over een
                minuut.
              </p>
            )}
            {order.tickets.length ? (
              <ul
                style={{
                  marginTop: 18,
                  paddingLeft: 18,
                  color: 'rgba(243,234,216,0.78)',
                }}
              >
                {order.tickets.map((t) => (
                  <li key={t.code} style={{ marginBottom: 6 }}>
                    {t.label || t.ticketType}:{' '}
                    <code
                      style={{
                        color: '#e6c98a',
                        background: 'rgba(0,0,0,0.35)',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      {t.code}
                    </code>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <p style={{ marginTop: 28 }}>
          <Link href="/tickets" style={{ color: '#d4af6a', fontWeight: 700 }}>
            ← Terug naar tickets
          </Link>
        </p>
      </div>
    </NieuwShell>
  );
}

export default function TicketsBedanktPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, color: 'rgba(243,234,216,0.65)' }}>Laden…</div>}>
      <BedanktInner />
    </Suspense>
  );
}
