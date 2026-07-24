'use client';

import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { GUEST_CONTACT_INFO } from '@/components/guest-portal/guest-portal-data';

export default function ContactPage() {
  const c = GUEST_CONTACT_INFO;
  return (
    <NieuwShell portal="gasten">
      <section className="nieuw-sectie">
        <div className="nieuw-wrap" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 36 }}>
          <div>
            <h1 className="nieuw-h1">
              Neem <em>contact</em> op
            </h1>
            <div className="nieuw-panel" style={{ marginTop: 28 }}>
              <p>
                <strong>{c.company}</strong>
                <br />
                {c.street}
                <br />
                {c.cityLine}
              </p>
              <p style={{ marginTop: 16 }}>
                <a className="nieuw-link" href={`mailto:${c.email}`}>
                  {c.email}
                </a>
                <br />
                <a className="nieuw-link" href={`tel:${c.phoneTel}`}>
                  {c.phoneDisplay}
                </a>
              </p>
              <p style={{ marginTop: 16, color: 'var(--n-mut)', fontSize: 13.5 }}>
                Bank: {c.bankLabel}
                <br />
                IBAN: {c.iban}
                <br />
                BTW: {c.vat}
              </p>
              <a
                className="nieuw-btn"
                style={{ marginTop: 22 }}
                href={c.mapsOpenUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open in Google Maps
              </a>
            </div>
          </div>
          <div className="nieuw-panel" style={{ padding: 0, overflow: 'hidden', minHeight: 380 }}>
            <iframe
              title="Kaart Class-Models"
              src={c.mapsEmbedUrl}
              style={{ width: '100%', height: '100%', minHeight: 380, border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </NieuwShell>
  );
}
