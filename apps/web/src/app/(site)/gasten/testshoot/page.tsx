import type { Metadata } from 'next';
import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { TestshootDownloadClient } from '@/components/nieuw/TestshootDownloadClient';

export const metadata: Metadata = {
  title: 'Testshoot-foto’s downloaden',
  description:
    'Download uw gratis testshoot-foto’s bij Class-Models. Vul kort feedback in; daarna krijgt u alle foto’s in volle kwaliteit.',
  alternates: {
    canonical: '/gasten/testshoot',
  },
  robots: { index: false, follow: false },
};

export default function GastenTestshootPage() {
  return (
    <NieuwShell portal="gasten">
      <section className="nieuw-sectie" style={{ paddingTop: 28 }}>
        <div className="nieuw-wrap">
          <TestshootDownloadClient />
        </div>
      </section>
    </NieuwShell>
  );
}
