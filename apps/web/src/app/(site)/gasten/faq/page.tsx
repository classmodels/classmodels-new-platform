import Link from 'next/link';
import type { Metadata } from 'next';
import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { GUEST_FAQ } from '@/components/guest-portal/guest-portal-data';

export const metadata: Metadata = {
  title: 'FAQ model worden | Veelgestelde vragen',
  description:
    'Antwoorden op veelgestelde vragen over model worden bij Class-Models: ervaring, kosten, leeftijd, casting, gratis testshoot, intake en werken in België.',
  alternates: {
    canonical: '/gasten/faq',
  },
  openGraph: {
    title: 'FAQ model worden | Class-Models',
    description:
      'Duidelijke antwoorden vóór u een gratis testshoot, casting of intake boekt bij Class-Models in Hulshout.',
    url: 'https://www.class-models.be/gasten/faq',
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: GUEST_FAQ.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.a,
    },
  })),
};

export default function FaqPage() {
  return (
    <NieuwShell portal="gasten">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <section className="nieuw-sectie">
        <div className="nieuw-wrap" style={{ maxWidth: 860 }}>
          <span className="nieuw-label">Gastenportaal</span>
          <h1 className="nieuw-display">
            Veelgestelde <em>vragen</em>
          </h1>
          <p className="nieuw-lead">
            Alles wat u wil weten vóór u een gratis testshoot, casting of intake-gesprek boekt bij
            Class-Models in Hulshout.
          </p>
          <div className="nieuw-faq" style={{ marginTop: 32 }}>
            {GUEST_FAQ.map((item, i) => (
              <details key={item.q} open={i === 0}>
                <summary>{item.q}</summary>
                <p className="a">{item.a}</p>
              </details>
            ))}
          </div>
          <div className="nieuw-hero-actions" style={{ marginTop: 36, flexWrap: 'wrap' }}>
            <Link className="nieuw-btn" href="/gasten/gratis-fotoshoot#agenda">
              Gratis testshoot
            </Link>
            <Link className="nieuw-btn" href="/gasten/casting#agenda">
              Casting
            </Link>
            <Link className="nieuw-btn" href="/gasten/intake#agenda">
              Intake-gesprek
            </Link>
            <Link className="nieuw-btn nieuw-btn-ghost" href="/gasten/contact">
              Contact
            </Link>
          </div>
        </div>
      </section>
    </NieuwShell>
  );
}
