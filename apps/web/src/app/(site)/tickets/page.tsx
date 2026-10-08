'use client';

import { useEffect, useRef, useState } from 'react';
import { NieuwShell } from '@/components/nieuw/NieuwShell';

const MYZYNN_SHOP =
  process.env.NEXT_PUBLIC_MYZYNN_SHOP_URL?.trim() ||
  'https://myzynn.be/events-tickets/shop/class-models/modeshow';

/** Na Mollie terug naar Class-Models (white-label), niet myzynn.be. */
const RETURN_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim().replace(/\/$/, '') ||
  'https://www.class-models.be';

function buildMyzynnEmbed(shopUrl: string) {
  const u = new URL(shopUrl);
  u.searchParams.set('embed', '1');
  u.searchParams.set('returnOrigin', RETURN_ORIGIN);
  return u.toString();
}

const MYZYNN_EMBED = buildMyzynnEmbed(
  process.env.NEXT_PUBLIC_MYZYNN_SHOP_EMBED_URL?.trim() || MYZYNN_SHOP,
);

const MIN_IFRAME_HEIGHT = 900;

export default function TicketsModeshowPage() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeHeight, setIframeHeight] = useState(MIN_IFRAME_HEIGHT);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type !== 'myzynn-shop-height') return;
      const next = Number(data.height);
      if (!Number.isFinite(next) || next < 200) return;
      setIframeHeight(Math.max(MIN_IFRAME_HEIGHT, Math.ceil(next)));
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <NieuwShell portal="gasten">
      <main
        style={{
          padding: '0 0 40px',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          overflowX: 'hidden',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '100%',
            background: '#fff',
          }}
        >
          <iframe
            ref={iframeRef}
            src={MYZYNN_EMBED}
            title="Class-Models ticketwinkel"
            allow="payment"
            scrolling="no"
            style={{
              display: 'block',
              width: '100%',
              maxWidth: '100%',
              height: iframeHeight,
              minHeight: MIN_IFRAME_HEIGHT,
              border: 0,
              overflow: 'hidden',
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
