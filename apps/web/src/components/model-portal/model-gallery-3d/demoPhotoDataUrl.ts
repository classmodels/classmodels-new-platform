'use client';

import { useEffect, useState } from 'react';

const HUES = [28, 340, 18, 205, 275, 12, 355, 185];

function buildDemoPhotoDataUrl(index: number): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const h = HUES[index % HUES.length] ?? 30;
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, `hsl(${h}, 28%, 42%)`);
  grad.addColorStop(1, `hsl(${h}, 22%, 26%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(256, 192, 84, 104, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(184, 316, 144, 220);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = d[i] * 0.34 + d[i + 1] * 0.5 + d[i + 2] * 0.16;
    d[i] = d[i + 1] = d[i + 2] = g;
  }
  ctx.putImageData(imgData, 0, 0);

  return canvas.toDataURL('image/jpeg', 0.96);
}

export const DEMO_WALL_COUNT = 8;

export function useDemoPhotoUrls(): string[] {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    setUrls(Array.from({ length: DEMO_WALL_COUNT }, (_, i) => buildDemoPhotoDataUrl(i)));
  }, []);

  return urls;
}
