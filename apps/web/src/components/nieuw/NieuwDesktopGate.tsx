'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/lib/use-is-mobile';

/**
 * Op gsm blijft de klassieke mobiele site de standaard.
 * Bezoekers die /nieuw openen op een klein scherm gaan terug naar /.
 */
export function NieuwDesktopGate({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const router = useRouter();

  useEffect(() => {
    if (isMobile === true) {
      router.replace('/');
    }
  }, [isMobile, router]);

  if (isMobile === null || isMobile === true) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: isMobile ? '#f1eee8' : '#0d0d11',
        }}
        aria-hidden
      />
    );
  }

  return <>{children}</>;
}
