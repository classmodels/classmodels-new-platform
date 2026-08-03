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
};

/**
 * Compacte, zakelijke melding in het midden van het scherm (zelfde stijl als try-out popups).
 */
export function NieuwAlertDialog({
  open,
  title = 'Nog even aanvullen',
  message,
  items,
  onClose,
  confirmLabel = 'Sluiten',
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
          background: 'rgba(8, 8, 11, 0.72)',
          boxSizing: 'border-box',
        }}
        onClick={(ev) => {
          if (ev.target === ev.currentTarget) onClose();
        }}
      >
        <div
          style={{
            width: 'min(420px, 100%)',
            background: '#16161e',
            border: '1px solid rgba(212, 175, 106, 0.45)',
            borderRadius: 4,
            boxShadow: '0 18px 50px rgba(0,0,0,0.65)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 14px',
              borderBottom: '1px solid rgba(243, 238, 230, 0.12)',
              background: '#101016',
            }}
          >
            <p
              id="nieuw-alert-title"
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
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
                width: 28,
                height: 28,
                borderRadius: 4,
                border: '1px solid rgba(243, 238, 230, 0.25)',
                background: 'transparent',
                color: '#f3eee6',
                fontSize: 18,
                lineHeight: 1,
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>

          <div style={{ padding: '18px 16px', color: '#9e9689', fontSize: 13, lineHeight: 1.55 }}>
            <p style={{ margin: 0, color: '#f3eee6' }}>{body}</p>
            {list.length > 0 ? (
              <ul
                style={{
                  margin: '12px 0 0',
                  padding: '0 0 0 1.15em',
                  display: 'grid',
                  gap: 6,
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
              gap: 8,
              padding: '12px 14px',
              borderTop: '1px solid rgba(243, 238, 230, 0.12)',
              background: '#101016',
            }}
          >
            <button type="button" className="nieuw-btn" onClick={onClose}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
