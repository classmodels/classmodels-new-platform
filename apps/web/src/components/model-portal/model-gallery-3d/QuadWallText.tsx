'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { Quad } from '@/components/model-portal/model-gallery-3d/quadTransform';
import { quadMatrix3d } from '@/components/model-portal/model-gallery-3d/quadTransform';

/** Tekst op een schuine muur via dezelfde homografie als muurfoto's. */
export function QuadWallText({
  quad,
  srcW,
  srcH,
  children,
  className,
  style,
}: {
  quad: Quad;
  srcW: number;
  srcH: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const matrix = quadMatrix3d(srcW, srcH, quad);

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: srcW,
        height: srcH,
        transformOrigin: '0 0',
        transform: matrix,
        transformStyle: 'preserve-3d',
        pointerEvents: 'none',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
