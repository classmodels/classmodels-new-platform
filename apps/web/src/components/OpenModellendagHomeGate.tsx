'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { OpenModellendagLanding } from '@/components/OpenModellendagLanding';
import {
  OPEN_MODELLENDAG_ENABLED,
  OPEN_MODELLENDAG_SKIP_KEY,
} from '@/lib/open-modellendag';

/**
 * Toont Open Modellendag als eerste beeld (gsm + desktop), tenzij bezoeker
 * “Naar de website” koos (?skipOmd=1). Terug via ?omd=1.
 */
export function OpenModellendagHomeGate({ children }: { children: ReactNode }) {
  const search = useSearchParams();
  const [skip, setSkip] = useState<boolean | null>(null);

  useEffect(() => {
    if (!OPEN_MODELLENDAG_ENABLED) {
      setSkip(true);
      return;
    }
    if (search.get('omd') === '1') {
      try {
        sessionStorage.removeItem(OPEN_MODELLENDAG_SKIP_KEY);
      } catch {
        /* ignore */
      }
      setSkip(false);
      return;
    }
    if (search.get('skipOmd') === '1') {
      try {
        sessionStorage.setItem(OPEN_MODELLENDAG_SKIP_KEY, '1');
      } catch {
        /* ignore */
      }
      setSkip(true);
      return;
    }
    try {
      setSkip(sessionStorage.getItem(OPEN_MODELLENDAG_SKIP_KEY) === '1');
    } catch {
      setSkip(false);
    }
  }, [search]);

  if (!OPEN_MODELLENDAG_ENABLED) return <>{children}</>;
  if (skip === null) {
    return <div className="min-h-[100dvh]" style={{ background: '#0a0908' }} aria-hidden />;
  }
  if (skip) return <>{children}</>;

  return <OpenModellendagLanding variant="page" showSiteLink />;
}
