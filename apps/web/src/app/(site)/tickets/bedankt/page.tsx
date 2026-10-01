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
  event: { title: string; eventDate?: string } | null;
};

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
        const row = await apiFetch<OrderStatus>(`/modeshow-tickets/orders/${encodeURIComponent(orderKey)}`);
        if (cancelled) return;
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

  return (
    <NieuwShell portal="gasten">
      <div className="nieuw-wrap" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 720 }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#856b3f', fontWeight: 700 }}>
          Bestelling
        </p>
        <h1 style={{ margin: '10px 0 16px', fontFamily: 'Georgia, serif', fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', color: '#191919' }}>
          {paid ? 'Bedankt voor je aankoop' : loading ? 'Betaling controleren…' : 'Bestellingstatus'}
        </h1>
        {err ? <p style={{ color: '#8b1e1e' }}>{err}</p> : null}
        {order ? (
          <div style={{ border: '1px solid #c2a164', padding: 22, background: '#fff' }}>
            <p style={{ margin: '0 0 8px', color: '#525049' }}>
              Status: <strong style={{ color: '#191919' }}>{order.status}</strong>
            </p>
            {order.event ? (
              <p style={{ margin: '0 0 8px', color: '#191919', fontFamily: 'Georgia, serif', fontSize: 20 }}>
                {order.event.title}
              </p>
            ) : null}
            <p style={{ margin: '0 0 8px', color: '#525049' }}>
              {order.firstName} · {order.email}
            </p>
            <p style={{ margin: '0 0 16px', color: '#525049' }}>
              Totaal € {Number(order.totalAmount).toFixed(2).replace('.', ',')} · {order.tickets.length} ticket(s)
            </p>
            {paid ? (
              <p style={{ margin: 0, color: '#3f3c37', lineHeight: 1.6 }}>
                Je tickets met QR-code zijn per e-mail verstuurd (controleer ook je spamfolder). Bewaar de PDF of toon
                de QR aan de ingang.
              </p>
            ) : (
              <p style={{ margin: 0, color: '#857f74' }}>
                Als je net betaald hebt, kan de bevestiging even duren. Ververs deze pagina over een minuut.
              </p>
            )}
            {order.tickets.length ? (
              <ul style={{ marginTop: 18, paddingLeft: 18, color: '#525049' }}>
                {order.tickets.map((t) => (
                  <li key={t.code}>
                    {t.label || t.ticketType}: <code>{t.code}</code>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <p style={{ marginTop: 28 }}>
          <Link href="/tickets" style={{ color: '#856b3f', fontWeight: 700 }}>
            ← Terug naar tickets
          </Link>
        </p>
      </div>
    </NieuwShell>
  );
}

export default function TicketsBedanktPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, color: '#857f74' }}>Laden…</div>}>
      <BedanktInner />
    </Suspense>
  );
}
