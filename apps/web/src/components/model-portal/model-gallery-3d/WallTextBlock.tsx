'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

const COPPER = '#e8b88a';
const COPPER_DIM = 'rgba(232,184,138,0.72)';
const WHITE = 'rgba(255,255,255,0.88)';

function useTextTexture(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  key: string,
  w = 512,
  h = 640,
) {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);
    ctx.clearRect(0, 0, w, h);
    draw(ctx, w, h);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export function WallTextBlock({
  position,
  rotation = [0, 0, 0],
  width,
  height,
  variant,
  nameFirst,
  nameLast,
  subtitle,
  availLines,
  stats,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  height: number;
  variant: 'name' | 'stats';
  nameFirst?: string;
  nameLast?: string;
  subtitle?: string;
  availLines?: string[];
  stats?: [string, string][];
}) {
  const texKey =
    variant === 'name'
      ? `name:${nameFirst}:${nameLast}:${subtitle}:${availLines?.join('|')}`
      : `stats:${stats?.map((r) => r.join('=')).join('|')}`;

  const tex = useTextTexture(
    (ctx, w, h) => {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      if (variant === 'name') {
        ctx.fillStyle = COPPER;
        ctx.font = '600 38px Georgia, serif';
        ctx.fillText(nameFirst ?? '', 0, 0);
        ctx.font = '600 52px Georgia, serif';
        ctx.fillText(nameLast ?? '', 0, 46);
        ctx.fillStyle = WHITE;
        ctx.font = '500 20px system-ui, sans-serif';
        ctx.fillText(subtitle ?? '', 0, 118);
        const grad = ctx.createLinearGradient(0, 148, w * 0.85, 148);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.5, 'rgba(232,184,138,0.75)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 148, w * 0.85, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = '600 16px system-ui, sans-serif';
        ctx.fillText('AVAILABLE FOR', 0, 162);
        ctx.font = '400 15px system-ui, sans-serif';
        ctx.fillStyle = WHITE;
        (availLines ?? []).forEach((line, i) => ctx.fillText(line, 0, 186 + i * 22));
      } else {
        ctx.fillStyle = COPPER;
        ctx.font = '600 34px Georgia, serif';
        ctx.fillText('MODEL STATS', 0, 0);
        (stats ?? []).forEach(([label, value], i) => {
          const y = 52 + i * 32;
          ctx.font = '400 16px system-ui, sans-serif';
          ctx.fillStyle = COPPER_DIM;
          ctx.textAlign = 'left';
          ctx.fillText(label.toUpperCase(), 0, y);
          ctx.fillStyle = WHITE;
          ctx.textAlign = 'right';
          ctx.fillText(value, w, y);
        });
      }
    },
    texKey,
  );

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  );
}
