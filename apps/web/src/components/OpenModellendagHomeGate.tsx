'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { OpenModellendagLanding } from '@/components/OpenModellendagLanding';
import { OPEN_MODELLENDAG_ENABLED } from '@/lib/open-modellendag';

const SKIP_KEY = 'cm-skip-open-modellendag';

/**
 * Toont Open Modellendag als eerste beeld (gsm + desktop), tenzij bezoeker
 * “Naar de website” koos (?skipOmd=1) of de actie uitstaat.
 */
export function OpenModellendagHomeGate({ children }: { children: ReactNode }) {
  const search = useSearchParams();
  const [skip, setSkip] = useState<boolean | null>(null);

  useEffect(() => {
    if (!OPEN_MODELLENDAG_ENABLED) {
      setSkip(true);
      return;
    }
    if (search.get('skipOmd') === '1') {
      try {
        sessionStorage.setItem(SKIP_KEY, '1');
      } catch {
        /* ignore */
      }
      setSkip(true);
      return;
    }
    try {
      setSkip(sessionStorage.getItem(SKIP_KEY) === '1');
    } catch {
      setSkip(false);
    }
  }, [search]);

  if (!OPEN_MODELLENDAG_ENABLED) return <>{children}</>;
  if (skip === null) {
    return <div className="min-h-[100dvh]" style={{ background: '#f3ebe0' }} aria-hidden />;
  }
  if (skip) return <>{children}</>;

  return <OpenModellendagLanding variant="page" showSiteLink />;
}
