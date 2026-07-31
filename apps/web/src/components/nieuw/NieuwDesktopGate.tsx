'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useIsMobile } from '@/lib/use-is-mobile';

function allowMobilePath(pathname: string): boolean {
  if (pathname === '/') return true;
  // Gastenportaal: info + agenda/boeken moeten op gsm werken (niet terug naar home).
  if (pathname.startsWith('/gasten')) return true;
  if (pathname.startsWith('/reviews')) return true;
  return false;
}

/**
 * Desktop behoudt de nieuwe site.
 * Op gsm/app: home = mobiele app; gasten-pagina’s (boeken/info) blijven bereikbaar.
 */
export function NieuwDesktopGate({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const pathname = usePathname() ?? '/';
  const router = useRouter();

  useEffect(() => {
    if (isMobile !== true) return;
    if (allowMobilePath(pathname)) return;

    if (pathname.startsWith('/modellen') || pathname.startsWith('/inloggen')) {
      router.replace('/?m=model');
      return;
    }

    router.replace('/?m=guest');
  }, [isMobile, pathname, router]);

  if (isMobile === null) {
    return <div className="min-h-[100dvh] bg-[#f1eee8] md:bg-[#0d0d11]" aria-hidden />;
  }

  if (isMobile === true && !allowMobilePath(pathname)) {
    return <div className="min-h-[100dvh] bg-[#f1eee8]" aria-hidden />;
  }

  return <>{children}</>;
}
