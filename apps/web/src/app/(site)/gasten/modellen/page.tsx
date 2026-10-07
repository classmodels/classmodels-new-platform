import type { Metadata } from 'next';
import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { NieuwModelsGallery } from '@/components/nieuw/NieuwModelsGallery';

export const metadata: Metadata = {
  title: 'Onze modellen | Class-Models',
  description:
    'Bekijk de modellen van Class-Models. Geen login nodig — ontdek new faces, try-out en high class.',
  alternates: {
    canonical: '/gasten/modellen',
  },
  openGraph: {
    title: 'Onze modellen | Class-Models',
    description: 'Bekijk het modelaanbod van Class-Models zonder in te loggen.',
    url: 'https://www.class-models.be/gasten/modellen',
    locale: 'nl_BE',
    type: 'website',
  },
};

export default function GastenModellenPage() {
  return (
    <NieuwShell portal="gasten">
      <section className="nieuw-sectie" style={{ paddingTop: 28 }}>
        <div className="nieuw-wrap">
          <span className="nieuw-label">Gastenportaal</span>
          <h1 className="nieuw-display nieuw-display-md" style={{ marginTop: 8 }}>
            Onze <em>modellen</em>
          </h1>
          <p className="nieuw-lead" style={{ marginTop: 12, maxWidth: 640 }}>
            Blader door onze modellen — zonder account. Zo krijg je een beeld van wie bij
            Class-Models hoort en hoe divers het bureau is.
          </p>
          <div style={{ marginTop: 28 }}>
            <NieuwModelsGallery title="Modellen van Class-Models" />
          </div>
        </div>
      </section>
    </NieuwShell>
  );
}
