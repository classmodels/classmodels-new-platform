'use client';

import type { ReactNode } from 'react';

/** Foto als dik canvas dat op de galerijmuur hangt (schaduw + diepte). */
export function GalleryCanvasFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative [perspective:900px]">
      {/* Schaduw op de muur */}
      <div
        className="pointer-events-none absolute -bottom-[0.55vw] left-[6%] right-[6%] h-[1.2vw] rounded-[50%] bg-black/55 blur-[0.45vw]"
        aria-hidden
      />
      <div
        className="relative transform-gpu transition duration-300 will-change-transform hover:-translate-y-[0.12vw]"
        style={{ transform: 'rotateX(4deg) translateZ(6px)' }}
      >
        {/* Canvas-dikte (onderkant) */}
        <div
          className="pointer-events-none absolute -bottom-[0.28vw] left-[3%] right-[3%] h-[0.32vw] rounded-b-[0.08vw] bg-gradient-to-b from-zinc-700 via-zinc-900 to-black"
          style={{ transform: 'rotateX(-68deg)', transformOrigin: 'top center' }}
          aria-hidden
        />
        {/* Canvas-dikte (rechterzijde) */}
        <div
          className="pointer-events-none absolute -right-[0.18vw] top-[4%] bottom-[4%] w-[0.22vw] rounded-r-[0.06vw] bg-gradient-to-l from-zinc-800 to-zinc-950"
          aria-hidden
        />
        <div className="relative overflow-hidden rounded-[0.12vw] bg-zinc-950 shadow-[0_0.55vw_1.4vw_rgba(0,0,0,0.72),0_0.15vw_0.35vw_rgba(0,0,0,0.5)] ring-1 ring-black/70">
          {children}
        </div>
      </div>
    </div>
  );
}
