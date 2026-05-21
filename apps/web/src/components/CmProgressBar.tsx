'use client';

export function CmProgressBar({
  label = 'Bezig…',
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={className} role="status" aria-live="polite" aria-busy="true">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className="cm-progress-bar h-full w-1/3 rounded-full bg-lime-400" />
      </div>
      {label ? <p className="mt-2 text-center text-sm text-zinc-400">{label}</p> : null}
    </div>
  );
}
