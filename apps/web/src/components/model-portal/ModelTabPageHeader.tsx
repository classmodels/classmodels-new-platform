import type { ReactNode } from 'react';

/**
 * Uniforme kop voor modelportaal-tabs: grote titel links, actieknoppen rechts,
 * subtiele gouden lijn eronder (portfolio / opleiding / try-out).
 */
export function ModelTabPageHeader({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <h1
          style={{
            margin: 0,
            flex: '1 1 auto',
            minWidth: 0,
            fontFamily: 'var(--n-serif)',
            fontSize: 'clamp(22px, 3vw, 30px)',
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
      <div
        aria-hidden
        style={{
          height: 1,
          marginTop: 14,
          background: 'linear-gradient(90deg, var(--n-gold-hair), transparent 85%)',
        }}
      />
    </div>
  );
}
