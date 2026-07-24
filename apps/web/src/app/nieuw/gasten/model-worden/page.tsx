'use client';

import Link from 'next/link';
import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { NieuwPortalHero } from '@/components/nieuw/NieuwPortalHero';
import {
  CARD_MODEL_WORDEN,
  MODEL_WORDEN_STATS,
  WAAROM_CHECKLIST,
  WAAROM_PARAGRAPHS,
} from '@/components/guest-portal/guest-portal-data';

export default function ModelWordenPage() {
  return (
    <NieuwShell portal="gasten">
      <section className="nieuw-sectie" style={{ paddingTop: 28 }}>
        <div className="nieuw-wrap">
          <NieuwPortalHero
            titleLines={['iedereen', 'verdient het om', 'te schitteren']}
            lead={
              <>
                Word model bij <span className="nieuw-hero-brand">Class-Models</span> – professioneel
                begeleid, persoonlijk en toegankelijk voor iedereen.
              </>
            }
            imageSrc="/nieuw/hero-2.png"
            imageAlt="Model worden bij Class-Models"
            imagePosition="left top"
          />
        </div>
      </section>

      <section style={{ paddingBottom: 40 }}>
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

      <section style={{ paddingBottom: 48 }}>
        <div className="nieuw-wrap">
          <h2 className="nieuw-h2" style={{ marginBottom: 22 }}>
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
                      ? '/nieuw/gasten/gratis-fotoshoot#agenda'
                      : i === 1
                        ? '/nieuw/gasten/casting#agenda'
                        : '/nieuw/gasten/intake#agenda'
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
            <h2 className="nieuw-h2" style={{ marginTop: 14 }}>
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
