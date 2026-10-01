import Link from 'next/link';

type Props = {
  href?: string;
  className?: string;
  /** Compacte header-hoogte vs footer. */
  size?: 'header' | 'footer';
};

/**
 * Merklogo zoals huisstijl-lockup:
 * CM | Class-Models + tagline.
 */
export function ClassModelsLogo({ href = '/', className = '', size = 'header' }: Props) {
  const inner = (
    <span className={`cm-logo cm-logo--${size}${className ? ` ${className}` : ''}`} aria-label="Class-Models Modeling Agency">
      <span className="cm-logo-left">
        <span className="cm-logo-cm">CM</span>
        <span className="cm-logo-agency">Modeling Agency</span>
      </span>
      <span className="cm-logo-divider" aria-hidden="true" />
      <span className="cm-logo-right">
        <span className="cm-logo-name">Class-Models</span>
        <span className="cm-logo-tag">Toegankelijk. Eerlijk. Professioneel.</span>
      </span>
    </span>
  );

  if (!href) return inner;
  return (
    <Link className="nieuw-merk cm-logo-link" href={href}>
      {inner}
    </Link>
  );
}
