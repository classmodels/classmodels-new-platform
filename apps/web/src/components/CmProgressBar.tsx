'use client';

export function CmProgressBar({
  label = 'Bezig…',
  className = '',
  percent,
  sublabel,
  indeterminate = false,
  prominent = false,
}: {
  label?: string;
  className?: string;
  /** 0–100; zonder waarde = onbepaalde animatie */
  percent?: number;
  sublabel?: string;
  indeterminate?: boolean;
  /** Grotere, opvallende variant voor grote downloads */
  prominent?: boolean;
}) {
  const pct = percent != null ? Math.min(100, Math.max(0, percent)) : null;
  const showIndeterminate = indeterminate || pct == null;

  return (
    <div
      className={`${prominent ? 'rounded-lg border-2 border-amber-400 bg-amber-50 p-4 shadow-md' : ''} ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-valuenow={pct ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {prominent && pct != null && !showIndeterminate ? (
        <p className="mb-2 text-center text-2xl font-bold tabular-nums text-burgundy">{pct}%</p>
      ) : null}
      <div className={`w-full overflow-hidden rounded-full bg-zinc-200 ${prominent ? 'h-4' : 'h-2'}`}>
        {showIndeterminate ? (
          <div
            className={`cm-progress-bar rounded-full bg-lime-500 ${prominent ? 'h-4 w-2/5' : 'h-full w-1/3'}`}
          />
        ) : (
          <div
            className={`rounded-full bg-lime-500 transition-[width] duration-150 ease-out ${prominent ? 'h-4' : 'h-full'}`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      {label ? (
        <p className={`mt-2 font-medium text-zinc-800 ${prominent ? 'text-sm' : 'text-xs'}`}>{label}</p>
      ) : null}
      {sublabel ? (
        <p className={`mt-1 text-zinc-600 ${prominent ? 'text-xs' : 'text-[11px]'}`}>{sublabel}</p>
      ) : null}
    </div>
  );
}
