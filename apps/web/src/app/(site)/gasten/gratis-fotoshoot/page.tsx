import type { Metadata } from 'next';
import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { NieuwBookingBlock } from '@/components/nieuw/NieuwBookingBlock';
import { NieuwPortalHero } from '@/components/nieuw/NieuwPortalHero';
import { MobileAgendaRedirect } from '@/components/MobileAgendaRedirect';
import {
  DOELGROEPEN_CARDS,
  GRATIS_FOTOSHOOT_PAGE,
} from '@/components/guest-portal/guest-portal-data';

export const metadata: Metadata = {
  title: 'Gratis fotoshoot voor nieuwe modellen',
  description:
    'Boek online een gratis fotoshoot bij Class-Models en ontdek of modellenwerk iets voor u is. Geen ervaring nodig.',
  alternates: {
    canonical: '/gasten/gratis-fotoshoot',
  },
};

export default function GratisFotoshootPage() {
  return (
    <NieuwShell portal="gasten">
      <MobileAgendaRedirect book="gratis-fotoshoot" />
      <section className="nieuw-sectie" style={{ paddingTop: 28 }}>
        <div className="nieuw-wrap">
          <NieuwPortalHero
            titleLines={['plan uw gratis', 'testshoot']}
            lead={GRATIS_FOTOSHOOT_PAGE.whyParagraph}
            imageSrc="/nieuw/hero-1.jpg"
            imageAlt="Gratis fotoshoot"
          />

          <div className="nieuw-agenda-align nieuw-after-hero">
            <h2 className="nieuw-h3 nieuw-agenda-title">{GRATIS_FOTOSHOOT_PAGE.expectTitle}</h2>
            <h2 className="nieuw-h3 nieuw-agenda-booking-title">Online afspraak maken testshoot</h2>
            <ul className="nieuw-checklist nieuw-agenda-frames">
              {GRATIS_FOTOSHOOT_PAGE.expectBullets.map((b) => (
                <li key={b}>
                  <span className="v">✓</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <NieuwBookingBlock slug={GRATIS_FOTOSHOOT_PAGE.agendaSlug} />
          </div>

          <h2 className="nieuw-h3" style={{ marginTop: 48 }}>
            In vier stappen
          </h2>
          <div className="nieuw-steps" style={{ marginTop: 16 }}>
            <div className="nieuw-stap">
              <p>
                <strong>Boek online.</strong> Kies een moment in de agenda hierboven.
              </p>
            </div>
            <div className="nieuw-stap">
              <p>
                <strong>Kom langs.</strong> U wordt vriendelijk ontvangen in Hulshout.
              </p>
            </div>
            <div className="nieuw-stap">
              <p>
                <strong>Voor de camera.</strong> Professionele begeleiding bij elke pose.
              </p>
            </div>
            <div className="nieuw-stap">
              <p>
                <strong>Ontvang foto&apos;s.</strong> Gratis — download ze later via{' '}
                <a className="nieuw-link" href="/gasten/testshoot">
                  Testshoot-foto&apos;s
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="nieuw-sectie nieuw-sectie-alt">
        <div className="nieuw-wrap">
          <span className="nieuw-label">Voor wie?</span>
          <h2 className="nieuw-display nieuw-display-md">
            Uiteenlopende <em>profielen</em>
          </h2>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 28 }}
          >
            {DOELGROEPEN_CARDS.map((d) => (
              <div key={d.title} className="nieuw-panel">
                <h3 className="nieuw-h3" style={{ color: 'var(--n-gold)', fontSize: 22 }}>
                  {d.title}
                </h3>
                <p className="nieuw-lead" style={{ marginTop: 8 }}>
                  {d.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </NieuwShell>
  );
}
