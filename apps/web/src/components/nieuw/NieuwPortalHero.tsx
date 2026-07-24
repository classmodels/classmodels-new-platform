import type { ReactNode } from 'react';

type NieuwPortalHeroProps = {
  /** Enkele titelregel (klassiek). */
  title?: string;
  titleEm?: string;
  /** Titelregels als blok, bv. ["plan uw gratis", "testshoot"]. */
  titleLines?: string[];
  lead: ReactNode;
  imageSrc: string;
  imageAlt?: string;
  /** CSS object-position, bv. "left top" zodat de bovenkant zichtbaar blijft. */
  imagePosition?: string;
};

export function NieuwPortalHero({
  title,
  titleEm,
  titleLines,
  lead,
  imageSrc,
  imageAlt = '',
  imagePosition,
}: NieuwPortalHeroProps) {
  const blockTitle = Boolean(titleLines?.length);

  return (
    <div className={`nieuw-portal-hero${blockTitle ? ' nieuw-portal-hero--banner' : ''}`}>
      <div className="nieuw-portal-hero-media" aria-hidden={imageAlt ? undefined : true}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={imageAlt}
          style={imagePosition ? { objectPosition: imagePosition } : undefined}
        />
      </div>
      <div className="nieuw-portal-hero-copy">
        {blockTitle && titleLines ? (
          <h1 className="nieuw-portal-hero-title-block">
            {titleLines.map((line, i) => (
              <span key={`${line}-${i}`} className={`lijn${i + 1}`}>
                {line}
              </span>
            ))}
          </h1>
        ) : (
          <h1 className="nieuw-h1">
            {title}
            {titleEm ? (
              <>
                {' '}
                <em>{titleEm}</em>
              </>
            ) : null}
          </h1>
        )}
        <p className={`nieuw-lead${blockTitle ? ' nieuw-portal-hero-lead-banner' : ''}`}>{lead}</p>
      </div>
    </div>
  );
}
