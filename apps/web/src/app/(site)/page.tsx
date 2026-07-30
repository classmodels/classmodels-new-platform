import Link from 'next/link';
import type { Metadata } from 'next';
import { NieuwShell } from '@/components/nieuw/NieuwShell';

export const metadata: Metadata = {
  title: 'Modellenbureau België | Model worden & casting',
  description:
    'Class-Models is een modellenbureau in België. Word model via een gratis fotoshoot, casting of intake-gesprek. Bedrijven boeken modellen voor campagnes, events en fotoshoots.',
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
        'Modellenbureau in België voor model worden, castings, gratis fotoshoots en professionele boekingen.',
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
            text: 'Via het gastenportaal boekt u online een gratis fotoshoot, casting of intake-gesprek.',
          },
        },
      ],
    },
  ],
};

export default function NieuwHomePage() {
  return (
    <NieuwShell portal="home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="nieuw-hero">
        <div className="nieuw-wrap nieuw-hero-grid">
          <div>
            <span className="nieuw-label">Modellenbureau · België</span>
            <h1 className="nieuw-display">
              Word model.
              <br />
              <em>Start vandaag.</em>
            </h1>
            <p className="nieuw-lead nieuw-hero-lead">
              Class-Models begeleidt nieuwe gezichten naar hun eerste stappen in het
              modellenwerk — toegankelijk, persoonlijk en professioneel. Boek online een gratis
              fotoshoot, casting of intake-gesprek.
            </p>
            <div className="nieuw-hero-actions">
              <Link className="nieuw-btn" href="/gasten/gratis-fotoshoot#agenda">
                Gratis fotoshoot boeken
              </Link>
              <Link className="nieuw-btn nieuw-btn-ghost" href="/gasten/model-worden">
                Hoe model worden werkt
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
              <h2>Gastenportaal</h2>
              <p>
                De snelste weg om in te schrijven: kies een gratis testshoot, casting of
                intake-gesprek en plan meteen een afspraak.
              </p>
              <ul>
                <li>Geen ervaring nodig</li>
                <li>Online boeken in enkele minuten</li>
                <li>Persoonlijke begeleiding in Hulshout</li>
                <li>Uiteenlopende leeftijden en profielen</li>
              </ul>
              <Link className="nieuw-btn" href="/gasten/model-worden" style={{ marginTop: 18 }}>
                Naar gastenportaal →
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
                alt="Gastenportaal Class-Models"
                loading="lazy"
                decoding="async"
                width={640}
                height={480}
              />
              <div className="nieuw-card-body">
                <h3>Gastenportaal</h3>
                <p>
                  Voor wie model wil worden: inschrijven, boeken en starten zonder omwegen.
                </p>
                <Link className="nieuw-btn" href="/gasten/model-worden">
                  Open gastenportaal →
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
          <p className="nieuw-lead" style={{ marginTop: 16 }}>
            Al meer dan 20 jaar helpen we mensen met uitstraling om model te worden — met of
            zonder ervaring. Diversiteit, flexibiliteit en persoonlijke begeleiding staan centraal.
          </p>
          <div className="nieuw-pitch-strip">
            <div>
              <strong>20+</strong>
              <span>Jaar ervaring</span>
            </div>
            <div>
              <strong>6</strong>
              <span>Doelgroepen</span>
            </div>
            <div>
              <strong>0</strong>
              <span>€ voor testshoot</span>
            </div>
            <div>
              <strong>1</strong>
              <span>Duidelijk gastenportaal</span>
            </div>
          </div>
        </div>
      </section>

      <section className="nieuw-sectie">
        <div className="nieuw-wrap nieuw-cta-band">
          <div>
            <span className="nieuw-label">Klaar om te starten?</span>
            <h2 className="nieuw-display nieuw-display-md">
              Plan je testshoot, casting of <em>intake-gesprek</em>
            </h2>
            <p className="nieuw-lead">
              Kies wat bij u past en boek online. Geen ervaring nodig — wel goesting om te
              schitteren.
            </p>
          </div>
          <div className="nieuw-hero-actions">
            <Link className="nieuw-btn" href="/gasten/intake#agenda">
              Intake-gesprek
            </Link>
            <Link className="nieuw-btn" href="/gasten/casting#agenda">
              Casting
            </Link>
            <Link className="nieuw-btn" href="/gasten/gratis-fotoshoot#agenda">
              Gratis testshoot
            </Link>
          </div>
        </div>
      </section>
    </NieuwShell>
  );
}
