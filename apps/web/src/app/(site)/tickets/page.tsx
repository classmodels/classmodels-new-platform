'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { useAuth } from '@/context/auth-context';

const MYZYNN_SHOP =
  process.env.NEXT_PUBLIC_MYZYNN_SHOP_URL?.trim() ||
  'https://myzynn.be/events-tickets/shop/class-models/modeshow';

const MYZYNN_EMBED =
  process.env.NEXT_PUBLIC_MYZYNN_SHOP_EMBED_URL?.trim() ||
  `${MYZYNN_SHOP}?embed=1`;

export default function TicketsModeshowPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) router.replace('/');
  }, [authLoading, isAdmin, router]);

  if (authLoading || !isAdmin) {
    return (
      <NieuwShell portal="gasten">
        <main style={{ padding: '48px 16px', textAlign: 'center', color: '#5c564c' }}>Laden…</main>
      </NieuwShell>
    );
  }

  return (
    <NieuwShell portal="gasten">
      <main
        style={{
          padding: '12px 0 40px',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          overflowX: 'hidden',
        }}
      >
        <header style={{ marginBottom: 12, padding: '0 12px' }}>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--cm-serif, Georgia, serif)',
              fontSize: 'clamp(1.2rem, 5.5vw, 2.35rem)',
              fontWeight: 700,
              color: '#1a1714',
              letterSpacing: '-0.02em',
            }}
          >
            Tickets modeshow
          </h1>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 'clamp(12px, 3.4vw, 14px)',
              lineHeight: 1.5,
              color: '#5c564c',
              maxWidth: 560,
            }}
          >
            Voorbeeldwinkel (alleen admin). Bezoekers zien dit menu nog niet.
          </p>
        </header>

        <div
          style={{
            width: '100%',
            maxWidth: '100%',
            overflow: 'hidden',
            background: '#fff',
            borderTop: '1px solid #e8e2d6',
            borderBottom: '1px solid #e8e2d6',
          }}
        >
          <iframe
            src={MYZYNN_EMBED}
            title="Class-Models ticketwinkel"
            allow="payment"
            style={{
              display: 'block',
              width: '100%',
              maxWidth: '100%',
              height: 'min(90dvh, 1100px)',
              minHeight: 520,
              border: 0,
            }}
          />
        </div>

        <p style={{ margin: '12px 12px 0', fontSize: 13, color: '#857f74' }}>
          Winkel opent niet?{' '}
          <a href={MYZYNN_SHOP} style={{ color: '#856b3f', fontWeight: 700 }} target="_blank" rel="noreferrer">
            Open de ticketshop in een nieuw tabblad
          </a>
          .
        </p>
      </main>
    </NieuwShell>
  );
}
