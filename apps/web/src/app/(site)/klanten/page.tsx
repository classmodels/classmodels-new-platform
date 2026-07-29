import type { Metadata } from 'next';
import { Suspense } from 'react';
import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { KlantenPortalClient } from '@/components/nieuw/KlantenPortalClient';

export const metadata: Metadata = {
  title: 'Modellen boeken voor bedrijven',
  description:
    'Boek professionele modellen via Class-Models. Casting, selectie, tarieven en begeleiding voor campagnes, events, reclame en fotoshoots in België.',
  alternates: { canonical: '/klanten' },
};

export default function KlantenPage() {
  return (
    <NieuwShell portal="klanten">
      <Suspense
        fallback={
          <section className="nieuw-uc" style={{ background: 'var(--n-bg)', minHeight: '40vh' }}>
            <p className="nieuw-lead">Laden…</p>
          </section>
        }
      >
        <KlantenPortalClient />
      </Suspense>
    </NieuwShell>
  );
}
