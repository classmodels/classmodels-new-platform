import type { ReactNode } from 'react';
import partnersJson from '@/data/partners.json';

/** Gedeelde bouwstenen voor de klantenportaal-infopagina's (stijl = info opleiding / try-out). */

export function KpTitel({ children }: { children: ReactNode }) {
  return <h3 className="cm-kp-titel">{children}</h3>;
}

export function KpCheck({ items }: { items: ReactNode[] }) {
  return (
    <ul className="cm-kp-check">
      {items.map((item, i) => (
        <li key={i}>
          <span aria-hidden className="cm-kp-check-dot">
            ✓
          </span>
          <span style={{ flex: 1 }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Twee kolommen: foto + tekst. `fotoRechts` wisselt de volgorde. */
export function KpFotoTekst({
  foto,
  alt,
  fotoRechts = false,
  children,
}: {
  foto: string;
  alt: string;
  fotoRechts?: boolean;
  children: ReactNode;
}) {
  const beeld = (
    <div className="cm-kp-foto" style={{ order: fotoRechts ? 2 : 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={foto} alt={alt} loading="lazy" decoding="async" />
    </div>
  );
  return (
    <section className="cm-kp-panel cm-kp-2col">
      {beeld}
      <div className="cm-kp-tekst" style={{ order: 1 }}>
        {children}
      </div>
    </section>
  );
}

export function KpAccordeon({
  titel,
  children,
  open = false,
}: {
  titel: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="cm-kp-acc" open={open || undefined}>
      <summary>{titel}</summary>
      <div className="cm-kp-acc-body">{children}</div>
    </details>
  );
}

type PartnerItem = { name: string; imagePath: string };

/** Logogrid van partners (statische lijst) voor «Wij werkten al samen met». */
export function KpPartnerGrid() {
  const partners = (partnersJson as PartnerItem[]).filter((p) =>
    p.imagePath?.startsWith('/partners/'),
  );
  return (
    <div className="cm-kp-partnergrid">
      {partners.map((p) => (
        <span key={p.imagePath} className="cm-kp-partnercel" title={p.name}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.imagePath} alt={p.name} loading="lazy" decoding="async" width={160} height={90} />
        </span>
      ))}
    </div>
  );
}
