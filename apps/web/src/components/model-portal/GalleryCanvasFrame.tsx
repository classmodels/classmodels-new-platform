'use client';

import type { ReactNode } from 'react';

/** ~1 cm canvas-dikte op schaal (vw). */
const T = '0.38vw';

/**
 * Foto als echt 3D-canvas op de muur: voorzijde + zichtbare onder- en zijkant (~1 cm).
 */
export function GalleryCanvasFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full [perspective:1100px]">
      {/* Contactschaduw op de muur */}
      <div
        className="pointer-events-none absolute left-[10%] right-[10%] top-[99%] h-[0.9vw] rounded-[50%] bg-black/60 blur-[0.4vw]"
        aria-hidden
      />
      <div
        className="relative mx-auto w-full [transform-style:preserve-3d]"
        style={{
          aspectRatio: '3/4',
          transform: 'rotateX(7deg)',
          transformOrigin: 'center bottom',
        }}
      >
        <div className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: `translateZ(${T})` }}>
          {/* Voorzijde (foto) */}
          <div className="absolute inset-0 overflow-hidden bg-zinc-950 shadow-[0_0.2vw_0.5vw_rgba(0,0,0,0.45)]">
            {children}
          </div>

          {/* Onderkant — canvas-dikte */}
          <div
            className="pointer-events-none absolute left-0 right-0 bg-gradient-to-b from-zinc-600 via-zinc-800 to-zinc-950"
            style={{
              height: T,
              top: '100%',
              transformOrigin: 'top center',
              transform: 'rotateX(-90deg)',
            }}
            aria-hidden
          />

          {/* Rechterzijkant — canvas-dikte */}
          <div
            className="pointer-events-none absolute top-0 bottom-0"
            style={{
              width: T,
              left: '100%',
              transformOrigin: 'left center',
              transform: 'rotateY(90deg)',
              background: 'linear-gradient(to left, #52525b, #18181b)',
            }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}

/** Linkermenu bevestigd op de schuine muur (links lager, rechts hoger). */
export function GalleryWallMount({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`[transform-style:preserve-3d] ${className}`}
      style={{
        transform: 'rotateY(31deg) rotateX(-2.5deg)',
        transformOrigin: 'right center',
      }}
    >
      {children}
    </div>
  );
}

/** Achterwandvlak waar de galerij op hangt. */
export function GalleryBackWall({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`[transform-style:preserve-3d] ${className}`}
      style={{
        transform: 'rotateY(-1.2deg) rotateX(0.8deg)',
        transformOrigin: 'left center',
      }}
    >
      {children}
    </div>
  );
}
