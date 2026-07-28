import type { ReactNode } from 'react';

type NieuwPortalHeroProps = {
  title?: string;
  titleEm?: string;
  titleLines?: string[];
  lead: ReactNode;
  imageSrc: string;
  imageAlt?: string;
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
          <h1 className="nieuw-display" style={{ fontSize: 'clamp(28px, 4.5vw, 48px)' }}>
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
