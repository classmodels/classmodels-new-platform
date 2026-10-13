'use client';

import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { GratisTestshootLanding } from '@/components/GratisTestshootLanding';
import { useAuth } from '@/context/auth-context';

/**
 * Beginpagina toont de gratis-testshoot-campagne (gsm + desktop),
 * behalve voor een ingelogd model en behalve als de bezoeker al
 * naar een portaal of de agenda gaat (?m= / ?book=).
 */
export function GratisTestshootHomeGate({ children }: { children: ReactNode }) {
  const search = useSearchParams();
  const { user, loading } = useAuth();
  const intoSite = Boolean(search.get('m') || search.get('book'));

  if (intoSite) return <>{children}</>;

  if (loading) {
    return <div className="min-h-[100dvh]" style={{ background: '#0a0908' }} aria-hidden />;
  }

  if (user?.roles?.includes('model')) return <>{children}</>;

  return <GratisTestshootLanding />;
}
