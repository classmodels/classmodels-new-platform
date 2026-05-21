'use client';

export function CmProgressBar({
  label = 'Bezig…',
  className = '',
  percent,
  sublabel,
  indeterminate = false,
}: {
  label?: string;
  className?: string;
  /** 0–100; zonder waarde = onbepaalde animatie */
  percent?: number;
  sublabel?: string;
  indeterminate?: boolean;
}) {
  const pct = percent != null ? Math.min(100, Math.max(0, percent)) : null;
  const showIndeterminate = indeterminate || pct == null;

  return (
    <div className={className} role="status" aria-live="polite" aria-busy="true">
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
        {showIndeterminate ? (
          <div className="cm-progress-bar h-full w-1/3 rounded-full bg-lime-500" />
        ) : (
          <div
            className="h-full rounded-full bg-lime-500 transition-[width] duration-150 ease-out"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      {label ? <p className="mt-1.5 text-xs font-medium text-zinc-700">{label}</p> : null}
      {sublabel ? <p className="mt-0.5 text-[11px] text-zinc-500">{sublabel}</p> : null}
    </div>
  );
}
