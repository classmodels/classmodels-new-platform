import type { ReactNode } from 'react';
import partnersJson from '@/data/partners.json';

/** Strakke, zakelijke bouwstenen voor de klantenportaal-pagina's. */

export function KpTitel({ children }: { children: ReactNode }) {
  return <h3 className="cm-kp-titel">{children}</h3>;
}

/**
 * Lijst met gouden vierkantjes + vinkje (of nummer).
 */
export function KpChecks({
  items,
  numbered = false,
}: {
  items: ReactNode[];
  numbered?: boolean;
}) {
  return (
    <ul className="cm-kp-checks">
      {items.map((item, i) => (
        <li key={i}>
          <span aria-hidden className="cm-kp-mark">
            {numbered ? i + 1 : '✓'}
          </span>
          <span className="cm-kp-checks-tekst">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function KpCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`cm-kp-card ${className}`.trim()}>{children}</section>;
}

/** Intro in twee duidelijke kolommen: statement links, inhoud rechts. */
export function KpIntro({
  label,
  titel,
  children,
}: {
  label: string;
  titel: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="cm-kp-card cm-kp-intro">
      <header className="cm-kp-intro-heading">
        <span className="cm-kp-eyebrow">{label}</span>
        <h1 className="cm-kp-intro-title">{titel}</h1>
      </header>
      <div className="cm-kp-intro-content">{children}</div>
    </section>
  );
}

/** Foto en tekst in één doorlopend kader; `fotoRechts` wisselt de volgorde. */
export function KpSplit({
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
  return (
    <section className="cm-kp-card cm-kp-split">
      <div
        className={`cm-kp-media${fotoRechts ? ' cm-kp-media--rechts' : ''}`}
        style={{ order: fotoRechts ? 2 : 0 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={foto} alt={alt} loading="lazy" decoding="async" />
      </div>
      <div className="cm-kp-body" style={{ order: 1 }}>
        {children}
      </div>
    </section>
  );
}

export function KpAccordeon({
  titel,
  children,
}: {
  titel: string;
  children: ReactNode;
}) {
  return (
    <details className="cm-kp-acc">
      <summary>{titel}</summary>
      <div className="cm-kp-acc-body">{children}</div>
    </details>
  );
}

type PartnerItem = { name: string; imagePath: string };

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
