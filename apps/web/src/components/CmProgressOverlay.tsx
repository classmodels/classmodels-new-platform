'use client';

import { createPortal } from 'react-dom';

/**
 * Vooruitgangspopup (upload/download) —zelfde donker/goud layout als validatie-popups.
 */
export function CmProgressOverlay({
  label,
  sublabel,
  percent,
  indeterminate = false,
}: {
  label: string;
  sublabel?: string;
  /** 0–100; zonder waarde = onbepaalde animatie */
  percent?: number;
  indeterminate?: boolean;
}) {
  if (typeof document === 'undefined') return null;

  const pct = percent != null ? Math.min(100, Math.max(0, percent)) : null;
  const showIndeterminate = indeterminate || pct == null;
  const wait =
    sublabel?.trim() ||
    'Even geduld, dit kan even duren — laat dit venster open.';

  return createPortal(
    <div
      className="nieuw-root"
      style={{ position: 'fixed', inset: 0, zIndex: 100000 }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          background: 'rgba(0, 0, 0, 0.78)',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: 'min(380px, 100%)',
            background: '#0c0c10',
            border: '1px solid rgba(212, 175, 106, 0.55)',
            boxShadow: '0 18px 50px rgba(0,0,0,0.7)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid rgba(243, 238, 230, 0.14)',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#d4af6a',
              }}
            >
              Even geduld
            </p>
          </div>
          <div style={{ padding: '20px 16px 22px' }}>
            <p style={{ margin: '0 0 6px', color: '#f3eee6', fontSize: 14, fontWeight: 600 }}>
              {label}
            </p>
            <p style={{ margin: '0 0 16px', color: '#cfc7ba', fontSize: 13, lineHeight: 1.5 }}>
              {wait}
            </p>
            {!showIndeterminate && pct != null ? (
              <p
                style={{
                  margin: '0 0 8px',
                  textAlign: 'center',
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#d4af6a',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {pct}%
              </p>
            ) : null}
            <div
              style={{
                width: '100%',
                height: 10,
                background: 'rgba(243, 238, 230, 0.12)',
                overflow: 'hidden',
              }}
            >
              {showIndeterminate ? (
                <div
                  className="cm-progress-bar"
                  style={{
                    height: '100%',
                    width: '40%',
                    background: '#d4af6a',
                  }}
                />
              ) : (
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: '#d4af6a',
                    transition: 'width 0.15s ease-out',
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
