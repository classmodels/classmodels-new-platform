import type { CSSProperties } from 'react';

export type WallPlaneLayout = {
  width: number;
  gapX: number;
  padX: number;
  padLeft?: number;
  padRight?: number;
  photoScale?: number;
  photoRightDropPx?: number;
};

function wallPhotoWidthPx(plane: WallPlaneLayout, baseW: number): number {
  const wallPx = (plane.width / 100) * baseW;
  const padL = plane.padLeft ?? plane.padX;
  const padR = plane.padRight ?? plane.padX;
  const innerPx = wallPx * (1 - padL / 100 - padR / 100);
  const cellPx = (innerPx - 3 * wallPx * (plane.gapX / 100)) / 4;
  return cellPx * (plane.photoScale ?? 1);
}

/** Trapezium: linkerrand op oorspronkelijke hoogte, rechterkant `dropPx` langer (1024-basis). */
export function wallPhotoCellStyle(
  plane: WallPlaneLayout,
  baseW: number,
  scale = 1,
): CSSProperties {
  const drop = plane.photoRightDropPx ?? 0;
  const photoW = wallPhotoWidthPx(plane, baseW);
  const photoH = photoW * 1.5;

  if (drop <= 0) {
    return {
      aspectRatio: '2 / 3',
      width: `${scale * 100}%`,
      maxHeight: `${scale * 100}%`,
    };
  }

  const leftBottomPct = (photoH / (photoH + drop)) * 100;

  return {
    width: `${scale * 100}%`,
    aspectRatio: `${2 * photoW} / ${3 * photoW + 2 * drop}`,
    maxHeight: `${scale * 100}%`,
    clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 ${leftBottomPct}%)`,
  };
}
