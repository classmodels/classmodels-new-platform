import type { Metadata } from 'next';
import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { NieuwBookingBlock } from '@/components/nieuw/NieuwBookingBlock';
import { NieuwPortalHero } from '@/components/nieuw/NieuwPortalHero';
import { CASTING_PAGE, DOELGROEPEN_CARDS } from '@/components/guest-portal/guest-portal-data';

export const metadata: Metadata = {
  title: 'Casting inschrijving voor modellen',
  description:
    'Schrijf u online in voor een casting bij Class-Models. Ontdek of uw profiel past bij campagnes, events en fotoshoots.',
  alternates: {
    canonical: '/gasten/casting',
  },
};

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

          <div className="nieuw-agenda-align nieuw-after-hero">
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

          <h2 className="nieuw-h3" style={{ marginTop: 48 }}>
            {CASTING_PAGE.howTitle}
          </h2>
          <div className="nieuw-steps" style={{ marginTop: 16 }}>
            {CASTING_PAGE.steps.map((s) => (
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
