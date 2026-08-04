import type { ReactNode } from 'react';

/**
 * Uniforme kop voor modelportaal-tabs: hoofdtitel links, actieknoppen rechts
 * (portfolio / opleiding / try-out) — geen lijn eronder.
 */
export function ModelTabPageHeader({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        marginBottom: 8,
      }}
    >
      <h1
        style={{
          margin: 0,
          flex: '1 1 auto',
          minWidth: 0,
          fontFamily: 'var(--n-serif)',
          fontSize: 'clamp(20px, 2.6vw, 28px)',
          fontWeight: 600,
          letterSpacing: '0.02em',
          color: 'var(--n-gold)',
          lineHeight: 1.2,
          textAlign: 'left',
        }}
      >
        {title}
      </h1>
      {actions ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 8,
            flex: '0 1 auto',
          }}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}
