'use client';

import { useEffect, useState } from 'react';

/**
 * Detecteert een gsm-scherm (breedte < 768px), ook in de app (PWA).
 * Geeft `null` terug zolang het nog niet bekend is (eerste render op de
 * server), zodat er niets verkeerd flitst.
 */
export function useIsMobile(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isMobile;
}
