'use client';

import { useEffect } from 'react';

/** Registreert `public/sw.js` voor Web Push en PWA (één keer per sessie). */
export function PushSwRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';
    const path = `${basePath}/sw.js`;
    void navigator.serviceWorker.register(path).catch(() => undefined);
  }, []);
  return null;
}
