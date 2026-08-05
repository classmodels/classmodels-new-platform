import type { ReactNode } from 'react';
import partnersJson from '@/data/partners.json';

/** Class Events-achtige kaarten voor het klantenportaal. */

export function KpTitel({ children }: { children: ReactNode }) {
  return <h3 className="cm-kp-titel">{children}</h3>;
}

/**
 * Lijst met gouden vierkantjes + vinkje (of nummer).
 * Stijl zoals «Waarom Class-Models»-checklist.
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

/** @deprecated gebruik KpChecks */
export function KpBullet({ items }: { items: ReactNode[] }) {
  return <KpChecks items={items} />;
}

export function KpCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`cm-kp-card ${className}`.trim()}>{children}</section>;
}

export function KpImageCard({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="cm-kp-card cm-kp-card--media">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" decoding="async" />
    </figure>
  );
}

/** Rij met twee aparte kaarten: tekst + foto (of omgekeerd). */
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
  const tekst = <KpCard className="cm-kp-card--fill">{children}</KpCard>;
  const beeld = <KpImageCard src={foto} alt={alt} />;
  return (
    <div className="cm-kp-split">
      {fotoRechts ? (
        <>
          {tekst}
          {beeld}
        </>
      ) : (
        <>
          {beeld}
          {tekst}
        </>
      )}
    </div>
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
