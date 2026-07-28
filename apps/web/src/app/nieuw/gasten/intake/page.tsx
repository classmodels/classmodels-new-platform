import type { Metadata } from 'next';
import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { NieuwBookingBlock } from '@/components/nieuw/NieuwBookingBlock';
import { NieuwPortalHero } from '@/components/nieuw/NieuwPortalHero';
import {
  DOELGROEPEN_CARDS,
  INTAKE_GESPREK_PAGE,
  WAAROM_CHECKLIST,
} from '@/components/guest-portal/guest-portal-data';

const INTAKE_LEAD =
  'Tijdens het intake-gesprek leren we u en uw uitstraling kennen. U krijgt eerlijk en professioneel advies over uw kansen — daarna kiest u zelf of u verder wil gaan.';

export const metadata: Metadata = {
  title: 'Intake-gesprek modellenbureau',
  description:
    'Plan een intake-gesprek bij Class-Models en krijg professioneel advies over uw kansen als model in België.',
  alternates: {
    canonical: '/nieuw/gasten/intake',
  },
};

export default function IntakePage() {
  return (
    <NieuwShell portal="gasten">
      <section className="nieuw-sectie" style={{ paddingTop: 28 }}>
        <div className="nieuw-wrap">
          <NieuwPortalHero
            titleLines={['plan uw', 'intake-gesprek']}
            lead={INTAKE_LEAD}
            imageSrc="/nieuw/hero-4.jpg"
            imageAlt="Intake-gesprek"
            imagePosition="left top"
          />

          <div className="nieuw-agenda-align nieuw-after-hero">
            <h2 className="nieuw-h3 nieuw-agenda-title">{INTAKE_GESPREK_PAGE.whyTitle}</h2>
            <h2 className="nieuw-h3 nieuw-agenda-booking-title">Maak online een intake-gesprek afspraak</h2>
            <ul className="nieuw-checklist nieuw-agenda-frames">
              {WAAROM_CHECKLIST.map((item) => (
                <li key={item}>
                  <span className="v">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <NieuwBookingBlock slug={INTAKE_GESPREK_PAGE.agendaSlug} />
          </div>

          <h2 className="nieuw-h3" style={{ marginTop: 48 }}>
            {INTAKE_GESPREK_PAGE.howTitle}
          </h2>
          <div className="nieuw-steps" style={{ marginTop: 16 }}>
            {INTAKE_GESPREK_PAGE.steps.map((s) => (
              <div key={s} className="nieuw-stap">
                <p>{s}</p>
              </div>
            ))}
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
