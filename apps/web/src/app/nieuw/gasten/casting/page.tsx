'use client';

import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { NieuwBookingBlock } from '@/components/nieuw/NieuwBookingBlock';
import { NieuwPortalHero } from '@/components/nieuw/NieuwPortalHero';
import { CASTING_PAGE, DOELGROEPEN_CARDS } from '@/components/guest-portal/guest-portal-data';

export default function CastingPage() {
  return (
    <NieuwShell portal="gasten">
      <section className="nieuw-sectie" style={{ paddingTop: 28 }}>
        <div className="nieuw-wrap">
          <NieuwPortalHero
            titleLines={['doe mee aan de', 'casting']}
            lead={CASTING_PAGE.whyParagraph}
            imageSrc="/nieuw/hero-6.jpg"
            imageAlt="Casting"
            imagePosition="left top"
          />

          <div className="nieuw-agenda-align" style={{ marginTop: 40 }}>
            <h2 className="nieuw-h3 nieuw-agenda-title">{CASTING_PAGE.expectTitle}</h2>
            <h2 className="nieuw-h3 nieuw-agenda-booking-title">Online inschrijving casting</h2>
            <ul className="nieuw-checklist nieuw-agenda-frames">
              {CASTING_PAGE.expectBullets.map((b) => (
                <li key={b}>
                  <span className="v">✓</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <NieuwBookingBlock slug={CASTING_PAGE.agendaSlug} />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2,1fr)',
              gap: 10,
              marginTop: 40,
            }}
          >
            {DOELGROEPEN_CARDS.map((d) => (
              <div key={d.title} className="nieuw-panel" style={{ padding: 16 }}>
                <strong style={{ color: 'var(--n-gold)' }}>{d.title}</strong>
                <p className="nieuw-lead" style={{ marginTop: 4, fontSize: 13 }}>
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
