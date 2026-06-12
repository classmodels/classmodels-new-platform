'use client';

import { CmProgressBar } from '@/components/CmProgressBar';

/**
 * Vooruitgangsbalk strak in het midden van het scherm (overlay) voor uploads/downloads.
 * Toon zolang de actie bezig is; standaard met de melding "Dit kan even duren".
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
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <CmProgressBar
          prominent
          label={label}
          sublabel={sublabel ?? 'Dit kan even duren — laat dit venster open.'}
          percent={percent}
          indeterminate={indeterminate}
        />
      </div>
    </div>
  );
}
