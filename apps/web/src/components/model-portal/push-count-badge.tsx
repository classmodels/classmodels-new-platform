import type { ReactNode } from 'react';
import { portalTitlebarPillClass } from '@/components/model-portal/portal-titlebar-pill';

type PushCountBadgeVariant = 'titlebar' | 'panel' | 'onBlack' | 'onWhite';

/**
 * Klein getal dat iets uit de hoek van de knop “steekt” (offset), zonder vaste kleuren van externe voorbeelden.
 */
export function PushCountBadge({
  count,
  variant = 'panel',
  'aria-hidden': ariaHidden,
}: {
  count: number;
  variant?: PushCountBadgeVariant;
  'aria-hidden'?: boolean;
}) {
  const display = count > 99 ? '99+' : String(count);
  const base =
    'push-pill-badge pointer-events-none absolute flex h-[1.125rem] min-w-[1.125rem] items-center justify-center px-0.5 text-[9px] font-bold leading-none shadow-sm';
  const skin =
    variant === 'titlebar'
      ? 'right-0 top-0 translate-x-1/2 -translate-y-1/2 border border-white/35 bg-white text-burgundy'
      : variant === 'onBlack'
        ? 'right-0 top-0 translate-x-[45%] -translate-y-[42%] border border-white/40 bg-white text-burgundy'
        : variant === 'onWhite'
          ? 'right-0 top-0 translate-x-[45%] -translate-y-[42%] border border-burgundy/40 bg-burgundy text-white'
          : 'right-0 top-0 translate-x-[45%] -translate-y-[42%] border border-zinc-300/90 bg-burgundy text-white';

  return (
    <span className={`${base} ${skin}`} aria-hidden={ariaHidden}>
      {display}
    </span>
  );
}

/** Filtertabs in de rode titelbalk — zelfde stijl als «Opdrachten»-pills. */
export function PushFilterPill({
  label,
  count,
  active,
  onClick,
  disabled,
  compact = false,
}: {
  label: ReactNode;
  count: number;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  /** Kleinere pill voor één regel in de push-titelbalk. */
  compact?: boolean;
}) {
  const pill = portalTitlebarPillClass(active);
  const showCount = count > 0;
  const countLabel = count > 99 ? '99+' : String(count);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex flex-col items-center justify-center gap-0 ${
        compact ? 'min-h-[1.5rem] !px-2 !py-0.5' : 'min-h-[1.75rem] px-2.5 py-1'
      } ${pill}`}
    >
      <span className={`font-medium leading-tight ${compact ? '!text-[10px]' : 'text-[11px]'}`}>{label}</span>
      {showCount ? (
        <span
          className={`text-[9px] font-bold leading-none ${
            active ? 'text-burgundy/90' : 'text-white/85'
          }`}
          aria-label={`${countLabel} berichten`}
        >
          {countLabel}
        </span>
      ) : null}
    </button>
  );
}
