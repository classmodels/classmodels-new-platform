'use client';

import type { ReactNode } from 'react';

/** Portret op de galerijmuur — subtiele diepte zonder kapotte 3D-CSS. */
export function GalleryPortraitFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full">
      <div
        className="pointer-events-none absolute left-[6%] right-[6%] top-[99%] h-[0.55vw] rounded-full bg-black/55 blur-[0.32vw]"
        aria-hidden
      />
      <div
        className="relative overflow-hidden bg-neutral-950 shadow-[0_0.28vw_0.75vw_rgba(0,0,0,0.62),0_0.06vw_0.18vw_rgba(0,0,0,0.45)] ring-1 ring-black/80"
        style={{ aspectRatio: '3/4' }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[32%] bg-gradient-to-b from-white/[0.09] to-transparent"
          aria-hidden
        />
        {children}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[0.12vw] bg-gradient-to-b from-neutral-600/80 to-neutral-900"
          aria-hidden
        />
      </div>
    </div>
  );
}

/** Linkermenu op de schuine muur (rechts hoger dan links). */
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
        transform: 'rotateY(26deg) rotateX(-1.2deg)',
        transformOrigin: 'right center',
      }}
    >
      {children}
    </div>
  );
}

/** @deprecated Use GalleryPortraitFrame */
export const GalleryCanvasFrame = GalleryPortraitFrame;

/** Achterwand — licht perspectief. */
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
        transform: 'rotateY(-0.8deg)',
        transformOrigin: 'left center',
      }}
    >
      {children}
    </div>
  );
}
