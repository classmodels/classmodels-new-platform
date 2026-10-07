'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { useAuth } from '@/context/auth-context';

const MYZYNN_EMBED =
  process.env.NEXT_PUBLIC_MYZYNN_SHOP_EMBED_URL?.trim() ||
  'https://myzynn.be/events-tickets/embed/class-models/modeshow';

const MYZYNN_SHOP =
  process.env.NEXT_PUBLIC_MYZYNN_SHOP_URL?.trim() ||
  'https://myzynn.be/events-tickets/shop/class-models/modeshow';

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
      <main style={{ padding: '28px 16px 64px', maxWidth: 960, margin: '0 auto' }}>
        <header style={{ marginBottom: 20 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--cm-serif, Georgia, serif)',
              fontSize: 'clamp(1.75rem, 4vw, 2.35rem)',
              fontWeight: 700,
              color: '#1a1714',
              letterSpacing: '-0.02em',
            }}
          >
            Tickets modeshow
          </h1>
          <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.55, color: '#5c564c', maxWidth: 560 }}>
            Voorbeeldwinkel (alleen admin). Bezoekers zien dit menu nog niet.
          </p>
        </header>

        <div
          style={{
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid #e8e2d6',
            background: '#fff',
            minHeight: 720,
          }}
        >
          <iframe
            src={MYZYNN_EMBED}
            title="Class-Models ticketwinkel"
            allow="payment"
            style={{ display: 'block', width: '100%', minHeight: 720, border: 0 }}
          />
        </div>

        <p style={{ marginTop: 14, fontSize: 13, color: '#857f74' }}>
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
