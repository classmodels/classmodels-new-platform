import Link from 'next/link';
import type { Metadata } from 'next';
import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { GUEST_FAQ } from '@/components/guest-portal/guest-portal-data';

export const metadata: Metadata = {
  title: 'FAQ model worden',
  description:
    'Lees de meest gestelde vragen over model worden, castings, gratis fotoshoots en inschrijven bij Class-Models.',
  alternates: {
    canonical: '/nieuw/gasten/faq',
  },
};

export default function FaqPage() {
  return (
    <NieuwShell portal="gasten">
      <section className="nieuw-sectie">
        <div className="nieuw-wrap" style={{ maxWidth: 860 }}>
          <h1 className="nieuw-display">
            Veelgestelde <em>vragen</em>
          </h1>
          <p className="nieuw-lead">Korte, duidelijke antwoorden vóór u een afspraak boekt.</p>
          <div className="nieuw-faq" style={{ marginTop: 32 }}>
            {GUEST_FAQ.map((item, i) => (
              <details key={item.q} open={i === 0}>
                <summary>{item.q}</summary>
                <p className="a">{item.a}</p>
              </details>
            ))}
          </div>
          <div style={{ marginTop: 36 }}>
            <Link className="nieuw-btn" href="/nieuw/gasten/gratis-fotoshoot#agenda">
              Klaar om te boeken? →
            </Link>
          </div>
        </div>
      </section>
    </NieuwShell>
  );
}
