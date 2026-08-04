'use client';

import { createPortal } from 'react-dom';

type NieuwAlertDialogProps = {
  open: boolean;
  title?: string;
  /** Korte inleiding boven de lijst. */
  message?: string | null;
  /** Opsomming van ontbrekende / foutieve velden. */
  items?: string[];
  onClose: () => void;
  confirmLabel?: string;
  /** Optionele tweede knop (rechts, goud). */
  primaryLabel?: string;
  onPrimary?: () => void;
};

/**
 * Compacte melding midden op het scherm — donker + goud (Class-Models popups).
 */
export function NieuwAlertDialog({
  open,
  title = 'Nog even aanvullen',
  message,
  items,
  onClose,
  confirmLabel = 'Sluiten',
  primaryLabel,
  onPrimary,
}: NieuwAlertDialogProps) {
  if (!open || typeof document === 'undefined') return null;

  const list = (items ?? []).map((x) => x.trim()).filter(Boolean);
  const body =
    message?.trim() ||
    (list.length
      ? 'Gelieve de volgende gegevens nog in te vullen of te corrigeren:'
      : 'Controleer uw gegevens en probeer opnieuw.');

  return createPortal(
    <div className="nieuw-root" style={{ position: 'fixed', inset: 0, zIndex: 100000 }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nieuw-alert-title"
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
        onClick={(ev) => {
          if (ev.target === ev.currentTarget) onClose();
        }}
      >
        <div
          style={{
            width: 'min(400px, 100%)',
            background: '#0c0c10',
            border: '1px solid rgba(212, 175, 106, 0.55)',
            boxShadow: '0 18px 50px rgba(0,0,0,0.7)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '14px 16px',
              borderBottom: '1px solid rgba(243, 238, 230, 0.14)',
            }}
          >
            <p
              id="nieuw-alert-title"
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#d4af6a',
              }}
            >
              {title}
            </p>
            <button
              type="button"
              aria-label="Sluiten"
              onClick={onClose}
              style={{
                width: 30,
                height: 30,
                border: '1px solid rgba(243, 238, 230, 0.28)',
                background: 'transparent',
                color: '#f3eee6',
                fontSize: 18,
                lineHeight: 1,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>

          <div style={{ padding: '20px 16px', color: '#cfc7ba', fontSize: 14, lineHeight: 1.55 }}>
            <p style={{ margin: 0, color: '#f3eee6' }}>{body}</p>
            {list.length > 0 ? (
              <ul
                style={{
                  margin: '14px 0 0',
                  padding: '0 0 0 1.15em',
                  display: 'grid',
                  gap: 8,
                  color: '#f3eee6',
                }}
              >
                {list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
              gap: 10,
              padding: '12px 16px 14px',
              borderTop: '1px solid rgba(243, 238, 230, 0.14)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                minWidth: 110,
                padding: '10px 16px',
                border: '1px solid rgba(243, 238, 230, 0.35)',
                background: 'transparent',
                color: '#f3eee6',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {confirmLabel}
            </button>
            {primaryLabel && onPrimary ? (
              <button
                type="button"
                onClick={onPrimary}
                style={{
                  minWidth: 140,
                  padding: '10px 16px',
                  border: 'none',
                  background: '#d4af6a',
                  color: '#0c0c10',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                {primaryLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
