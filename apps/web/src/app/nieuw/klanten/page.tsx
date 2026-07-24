'use client';

import Link from 'next/link';
import { NieuwShell } from '@/components/nieuw/NieuwShell';

export default function KlantenPage() {
  return (
    <NieuwShell portal="klanten">
      <section className="nieuw-uc">
        <div className="nieuw-wrap">
          <h1 className="nieuw-h1">
            Under <em>construction</em>
          </h1>
          <p className="nieuw-lead" style={{ margin: '18px auto 0', textAlign: 'center' }}>
            Het klantenportaal voor merken en bedrijven is in opbouw. Binnenkort kunt u hier
            modellen zoeken, casting-aanvragen indienen en uw bedrijfgegevens beheren.
          </p>
          <div style={{ marginTop: 36, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="nieuw-btn" href="/nieuw">
              Terug naar begin
            </Link>
            <Link className="nieuw-btn nieuw-btn-ghost" href="/nieuw/gasten">
              Naar gastenportaal
            </Link>
            <a className="nieuw-btn nieuw-btn-ghost" href="mailto:info@class-models.be">
              Contacteer ons
            </a>
          </div>
        </div>
      </section>
    </NieuwShell>
  );
}
