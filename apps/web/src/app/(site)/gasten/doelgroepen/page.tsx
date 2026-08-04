'use client';

import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { DOELGROEPEN_CARDS, DOELGROEPEN_INTRO } from '@/components/guest-portal/guest-portal-data';
import Link from 'next/link';

export default function DoelgroepenPage() {
  return (
    <NieuwShell portal="gasten">
      <section className="nieuw-sectie">
        <div className="nieuw-wrap">
          <h1 className="nieuw-h1">
            Voor wie we <em>zoeken</em>
          </h1>
          <p className="nieuw-lead">{DOELGROEPEN_INTRO}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginTop: 36 }}>
            {DOELGROEPEN_CARDS.map((d) => (
              <div key={d.title} className="nieuw-panel">
                <h2 className="nieuw-h3" style={{ color: "var(--n-gold)" }}>
                  {d.title}
                </h2>
                <p className="nieuw-lead" style={{ marginTop: 8 }}>
                  {d.body}
                </p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 40, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className="nieuw-btn" href="/gasten/gratis-fotoshoot#agenda">
              Boek gratis testshoot
            </Link>
            <Link className="nieuw-btn nieuw-btn-ghost" href="/gasten/casting#agenda">
              Boek casting
            </Link>
          </div>
        </div>
      </section>
    </NieuwShell>
  );
}
