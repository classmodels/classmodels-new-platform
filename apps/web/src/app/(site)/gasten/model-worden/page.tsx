import Link from 'next/link';
import type { Metadata } from 'next';
import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { NieuwPortalHero } from '@/components/nieuw/NieuwPortalHero';
import {
  CARD_MODEL_WORDEN,
  MODEL_WORDEN_STATS,
  WAAROM_CHECKLIST,
  WAAROM_PARAGRAPHS,
} from '@/components/guest-portal/guest-portal-data';

export const metadata: Metadata = {
  title: 'Model worden in België',
  description:
    'Lees hoe model worden bij Class-Models werkt. Kies tussen gratis fotoshoot, casting of intake-gesprek en schrijf u eenvoudig online in.',
  alternates: {
    canonical: '/gasten/model-worden',
  },
};

export default function ModelWordenPage() {
  return (
    <NieuwShell portal="gasten">
      <section className="nieuw-sectie" style={{ paddingTop: 28 }}>
        <div className="nieuw-wrap">
          <NieuwPortalHero
            titleLines={['iedereen', 'verdient het', 'te schitteren']}
            lead={
              <>
                Word model bij <span className="nieuw-hero-brand">Class-Models</span> — professioneel
                begeleid, persoonlijk en toegankelijk voor iedereen.
              </>
            }
            imageSrc="/nieuw/hero-2.jpg"
            imageAlt="Model worden bij Class-Models"
            imagePosition="left top"
          />
        </div>
      </section>

      <section style={{ paddingBottom: 28 }}>
        <div
          className="nieuw-wrap"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}
        >
          {MODEL_WORDEN_STATS.map((s) => (
            <div key={s.label} className="nieuw-panel" style={{ textAlign: 'center', padding: 22 }}>
              <div style={{ fontFamily: 'var(--n-serif)', fontSize: 34, color: 'var(--n-gold)' }}>
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'var(--n-dim)',
                  marginTop: 6,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ paddingTop: 28, paddingBottom: 48 }}>
        <div className="nieuw-wrap">
          <h2 className="nieuw-display nieuw-display-md" style={{ marginBottom: 22 }}>
            Drie manieren om te <em>starten</em>
          </h2>
          <div className="nieuw-choice-grid">
            {CARD_MODEL_WORDEN.map((c, i) => (
              <div key={c.title} className="nieuw-panel nieuw-choice-card">
                <span className="nieuw-label">{c.kicker}</span>
                <h3 className="nieuw-h3" style={{ marginTop: 12 }}>
                  {c.title}
                </h3>
                <ul className="nieuw-checklist" style={{ marginTop: 18, flex: 1 }}>
                  {c.bullets.map((b) => (
                    <li key={b}>
                      <span className="v">✓</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  className="nieuw-btn"
                  href={
                    i === 0
                      ? '/gasten/gratis-fotoshoot#agenda'
                      : i === 1
                        ? '/gasten/casting#agenda'
                        : '/gasten/intake#agenda'
                  }
                >
                  {c.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="nieuw-sectie"
        style={{
          background: 'var(--n-bg-2)',
          borderTop: '1px solid var(--n-hair)',
          borderBottom: '1px solid var(--n-hair)',
        }}
      >
        <div
          className="nieuw-wrap"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}
        >
          <div>
            <span className="nieuw-label">Waarom Class-Models</span>
            <h2 className="nieuw-display nieuw-display-md" style={{ marginTop: 14 }}>
              Toegankelijk. Transparant. <em>Professioneel.</em>
            </h2>
            {WAAROM_PARAGRAPHS.map((p) => (
              <p key={p} className="nieuw-lead" style={{ marginTop: 14 }}>
                {p}
              </p>
            ))}
          </div>
          <ul className="nieuw-checklist">
            {WAAROM_CHECKLIST.map((item) => (
              <li key={item}>
                <span className="v">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </NieuwShell>
  );
}
