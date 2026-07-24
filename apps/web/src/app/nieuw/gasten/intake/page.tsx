'use client';

import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { NieuwBookingBlock } from '@/components/nieuw/NieuwBookingBlock';
import { NieuwPortalHero } from '@/components/nieuw/NieuwPortalHero';
import { INTAKE_GESPREK_PAGE, WAAROM_CHECKLIST } from '@/components/guest-portal/guest-portal-data';

const INTAKE_LEAD =
  'Tijdens het intakegesprek leren we u en uw uitstraling kennen. U krijgt eerlijk en professioneel advies over uw kansen — daarna kiest u zelf of u verder wil gaan.';

export default function IntakePage() {
  return (
    <NieuwShell portal="gasten">
      <section className="nieuw-sectie" style={{ paddingTop: 28 }}>
        <div className="nieuw-wrap">
          <NieuwPortalHero
            titleLines={['plan uw', 'intake gesprek']}
            lead={INTAKE_LEAD}
            imageSrc="/nieuw/hero-4.png"
            imageAlt="Intake gesprek"
            imagePosition="left top"
          />

          <div className="nieuw-agenda-align" style={{ marginTop: 40 }}>
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
    </NieuwShell>
  );
}
