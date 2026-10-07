import Link from 'next/link';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MobileHomeGate } from '@/components/MobileHomeGate';
import { OpenModellendagHomeGate } from '@/components/OpenModellendagHomeGate';
import { OpenModellendagSiteCta } from '@/components/OpenModellendagSiteCta';
import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { OPEN_MODELLENDAG_ENABLED } from '@/lib/open-modellendag';

export const metadata: Metadata = OPEN_MODELLENDAG_ENABLED
  ? {
      title: 'Open Modellendag | Class-Models',
      description:
        'Gratis catwalkles op zondag 11 oktober in Hulshout. Schrijf je in voor 11.00, 13.00, 15.00 of 17.00 — toegankelijk voor iedereen, geen ervaring nodig.',
      alternates: { canonical: '/' },
      openGraph: {
        title: 'Open Modellendag | Class-Models',
        description:
          'Ontdek het model in jezelf. Gratis catwalkles, kleine groepen, alle leeftijden welkom.',
        url: 'https://www.class-models.be',
        locale: 'nl_BE',
        type: 'website',
        images: [{ url: 'https://www.class-models.be/nieuw/open-modellendag-poster.jpg' }],
      },
    }
  : {
      title: 'Modellenbureau België | Model worden & casting',
      description:
        'Class-Models is een modellenbureau in België. Word model via een gratis testshoot, casting of intake-gesprek. Bedrijven boeken modellen voor campagnes, events en fotoshoots.',
      alternates: { canonical: '/' },
      openGraph: {
        title: 'Class-Models | Modellenbureau België',
        description:
          'Model worden of modellen boeken? Class-Models begeleidt nieuwe gezichten en levert professionele casting voor merken.',
        url: 'https://www.class-models.be',
        locale: 'nl_BE',
        type: 'website',
      },
    };

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'ModelingAgency',
      name: 'Class-Models',
      url: 'https://www.class-models.be',
      description:
        'Modellenbureau in België voor model worden, castings, gratis testshoots en professionele boekingen.',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Provinciebaan 3',
        postalCode: '2235',
        addressLocality: 'Hulshout',
        addressCountry: 'BE',
      },
      telephone: '+32485322307',
      email: 'info@class-models.be',
      areaServed: 'Belgium',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Moet ik ervaring hebben om model te worden?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Nee. Class-Models zoekt echte mensen met uitstraling. Ervaring is niet nodig.',
          },
        },
        {
          '@type': 'Question',
          name: 'Hoe schrijf ik mij in bij Class-Models?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Via Model worden boekt u online een vrijblijvende kennismaking — met of zonder gratis testshoot.',
          },
        },
        {
          '@type': 'Question',
          name: 'Kost een testshoot of intake iets?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'De gratis testshoot is zonder kosten en zonder verplichtingen. Verdere stappen bespreken we open en eerlijk.',
          },
        },
      ],
    },
  ],
};

export default function NieuwHomePage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh]" style={{ background: '#0a0908' }} />}>
      <OpenModellendagHomeGate>
        <MobileHomeGate>
          <NieuwShell portal="home">
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

      <section className="nieuw-hero">
        <div className="nieuw-wrap nieuw-hero-grid">
          <div>
            <div className="nieuw-hero-actions" style={{ marginBottom: 18, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Link className="nieuw-btn" href="/tickets">
                Try-out modeshow · Inkomtickets
              </Link>
              {OPEN_MODELLENDAG_ENABLED ? <OpenModellendagSiteCta /> : null}
            </div>
            <span className="nieuw-label">Modellenbureau · België</span>
            <h1 className="nieuw-display">
              Word model.
              <br />
              <em>Start vandaag.</em>
            </h1>
            <p className="nieuw-lead nieuw-hero-lead">
              Class-Models begeleidt nieuwe gezichten naar hun eerste stappen in het
              modellenwerk — toegankelijk, persoonlijk en professioneel. Boek online een gratis
              testshoot, casting of intake-gesprek.
            </p>
            <div className="nieuw-hero-actions">
              <Link className="nieuw-btn" href="/gasten/model-worden#inschrijven">
                Maak een vrijblijvende online afspraak
              </Link>
            </div>
          </div>

          <aside className="nieuw-hero-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/nieuw/hero-home.jpg"
              alt="Modellen van Class-Models"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              width={800}
              height={1000}
            />
            <div className="nieuw-hero-card-body">
              <h2>Model worden?</h2>
              <p>
                De snelste weg om in te schrijven: kies je kennismaking en plan meteen een
                afspraak.
              </p>
              <ul>
                <li>Geen ervaring nodig</li>
                <li>Online boeken in enkele minuten</li>
                <li>Persoonlijke begeleiding in Hulshout</li>
                <li>Uiteenlopende leeftijden en profielen</li>
              </ul>
              <Link className="nieuw-btn" href="/gasten/model-worden" style={{ marginTop: 18 }}>
                Model worden? →
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="nieuw-sectie">
        <div className="nieuw-wrap">
          <span className="nieuw-label">Portalen</span>
          <h2 className="nieuw-display nieuw-display-md">
            Voor elk <em>doel</em> een omgeving
          </h2>
          <div className="nieuw-grid-3">
            <article className="nieuw-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/nieuw/gastenportaal.jpg"
                alt="Model worden bij Class-Models"
                loading="lazy"
                decoding="async"
                width={640}
                height={480}
              />
              <div className="nieuw-card-body">
                <h3>Model worden?</h3>
                <p>
                  Voor wie model wil worden: inschrijven, boeken en starten zonder omwegen.
                </p>
                <Link className="nieuw-btn" href="/gasten/model-worden">
                  Model worden? →
                </Link>
              </div>
            </article>
            <article className="nieuw-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/nieuw/modellenportaal.jpg"
                alt="Modellenportaal Class-Models"
                loading="lazy"
                decoding="async"
                width={640}
                height={480}
              />
              <div className="nieuw-card-body">
                <h3>Modellenportaal</h3>
                <p>
                  Voor contractmodellen: profiel, opdrachten, portfolio en communicatie met het
                  bureau.
                </p>
                <Link className="nieuw-btn nieuw-btn-ghost" href="/modellen">
                  Open modellenportaal →
                </Link>
              </div>
            </article>
            <article className="nieuw-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/nieuw/klantenportaal.jpg"
                alt="Klantenportaal Class-Models"
                loading="lazy"
                decoding="async"
                width={640}
                height={480}
              />
              <div className="nieuw-card-body">
                <h3>Klantenportaal</h3>
                <p>
                  Voor merken en bedrijven: modellen selecteren, casting aanvragen en boekingen
                  plannen.
                </p>
                <Link className="nieuw-btn nieuw-btn-ghost" href="/klanten">
                  Open klantenportaal →
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="nieuw-sectie nieuw-sectie-alt">
        <div className="nieuw-wrap">
          <span className="nieuw-label">Waarom Class-Models</span>
          <h2 className="nieuw-display nieuw-display-md">
            Toegankelijk. Eerlijk. <em>Professioneel.</em>
          </h2>
          <p
            className="nieuw-lead"
            style={{ marginTop: 16, maxWidth: 'min(720px, 100%)', whiteSpace: 'pre-line' }}
          >
            {`Al meer dan 20 jaar helpen we mensen met uitstraling om model te worden, met of zonder ervaring.
Diversiteit, flexibiliteit en persoonlijke begeleiding staan centraal.`}
          </p>
        </div>
      </section>
          </NieuwShell>
        </MobileHomeGate>
      </OpenModellendagHomeGate>
    </Suspense>
  );
}
