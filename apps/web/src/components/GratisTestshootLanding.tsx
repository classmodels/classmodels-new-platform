'use client';

import { useRouter } from 'next/navigation';
import '@/components/gratis-testshoot.css';

const POSTER = '/nieuw/ontdek-modellenwerk.jpg';

export type HomeCampaign = {
  slug: string;
  kicker: string;
  title: string;
  lead: string;
  body: string;
  highlight: string;
  close: string;
  button: string;
  image: string;
};

function pakketForSlug(slug: string): string {
  if (slug === 'intake-gesprek') return 'intake';
  if (slug === 'modellendag') return 'modellendag';
  return 'testshoot';
}

/** Gsm → mobiele agenda. Desktop → inschrijven met het pakket al gekozen. */
export function goToGuestAgenda(push: (href: string) => void, slug: string) {
  const pakket = pakketForSlug(slug);
  const mobile = window.matchMedia('(max-width: 767px)').matches;
  if (mobile) {
    push(`/?m=guest&book=${encodeURIComponent(slug)}&pakket=${encodeURIComponent(pakket)}`);
    return;
  }
  window.location.assign(`/gasten/model-worden?pakket=${encodeURIComponent(pakket)}#inschrijven`);
}

export function goToGratisTestshootAgenda(push: (href: string) => void) {
  goToGuestAgenda(push, 'gratis-fotoshoot');
}

export function GratisTestshootLanding({ campaign: _campaign }: { campaign?: HomeCampaign | null }) {
  const router = useRouter();
  const go = () => router.push('/?site=1');

  return (
    <div className="gts-root">
      <section className="gts-hero">
        <div className="gts-only">
          <button type="button" className="gts-poster" onClick={go} aria-label="Verder naar de site">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={POSTER}
              alt="Class-Models. Ontdek of modellenwerk iets voor jou is."
              width={819}
              height={1024}
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </button>
          <button type="button" className="gts-go" onClick={go}>
            Verder naar de site
          </button>
        </div>
      </section>
    </div>
  );
}
