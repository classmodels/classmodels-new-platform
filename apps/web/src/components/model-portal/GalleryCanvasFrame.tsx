'use client';

import type { ReactNode } from 'react';

/** Canvas aan de muur — zichtbare rand + schaduw (frontaal, geen kapotte 3D). */
export function GalleryCanvasFrame({ children }: { children: ReactNode }) {
  return (
    <div className="group relative w-full">
      {/* Schaduw op de muur */}
      <div
        className="pointer-events-none absolute left-[8%] right-[8%] top-[calc(100%+2px)] h-2 rounded-full bg-black/50 blur-[3px] transition group-hover:blur-[4px]"
        aria-hidden
      />
      <div className="relative transition duration-300 group-hover:-translate-y-0.5">
        {/* Canvas-dikte — rechterrand */}
        <div
          className="pointer-events-none absolute -right-[5px] top-[6px] bottom-[6px] w-[5px] rounded-r-sm bg-gradient-to-l from-zinc-600 to-zinc-800"
          aria-hidden
        />
        {/* Canvas-dikte — onderrand */}
        <div
          className="pointer-events-none absolute -bottom-[5px] left-[6px] right-[6px] h-[5px] rounded-b-sm bg-gradient-to-b from-zinc-600 to-zinc-900"
          aria-hidden
        />
        {/* Voorzijde */}
        <div className="relative overflow-hidden bg-zinc-950 shadow-[0_4px_14px_rgba(0,0,0,0.55),0_1px_3px_rgba(0,0,0,0.4)] ring-1 ring-black/70">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[28%] bg-gradient-to-b from-white/[0.08] to-transparent"
            aria-hidden
          />
          <div className="relative aspect-[3/4] w-full">{children}</div>
        </div>
      </div>
    </div>
  );
}

export const GalleryPortraitFrame = GalleryCanvasFrame;
