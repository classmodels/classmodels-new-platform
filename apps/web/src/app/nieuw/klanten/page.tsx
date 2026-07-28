import type { Metadata } from 'next';
import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { KlantenPortalClient } from '@/components/nieuw/KlantenPortalClient';

export const metadata: Metadata = {
  title: 'Modellen boeken voor bedrijven',
  description:
    'Boek professionele modellen via Class-Models. Casting, selectie, tarieven en begeleiding voor campagnes, events, reclame en fotoshoots in België.',
  alternates: { canonical: '/nieuw/klanten' },
};

export default function KlantenPage() {
  return (
    <NieuwShell portal="klanten">
      <KlantenPortalClient />
    </NieuwShell>
  );
}
