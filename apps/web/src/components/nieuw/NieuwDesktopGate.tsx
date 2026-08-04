'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useIsMobile } from '@/lib/use-is-mobile';

/** Pad → mobiele info-key (?m=guest&info=). */
const INFO_REDIRECT: Record<string, string> = {
  '/gasten/model-worden': 'model-worden',
  '/gasten/gratis-fotoshoot': 'gratis-fotoshoot',
  '/gasten/casting': 'casting',
  '/gasten/intake': 'intake',
  '/gasten/doelgroepen': 'doelgroepen',
  '/gasten/faq': 'faq',
  '/gasten/contact': 'contact',
};

const BOOK_FROM_INFO: Record<string, string> = {
  'gratis-fotoshoot': 'gratis-fotoshoot',
  casting: 'casting',
  intake: 'intake',
};

function allowMobilePath(pathname: string): boolean {
  if (pathname === '/') return true;
  if (pathname.startsWith('/modellen')) return true;
  if (pathname.startsWith('/klanten')) return true;
  if (pathname === '/reviews' || pathname.startsWith('/reviews/')) return true;
  if (pathname.startsWith('/gasten/testshoot')) return true;
  if (pathname.startsWith('/gasten/annuleer')) return true;
  if (pathname.startsWith('/gasten/bevestig')) return true;
  if (pathname.startsWith('/account')) return true;
  return false;
}

/**
 * Desktop = nieuwe site.
 * Gsm = app-routes; geen desktop-gastenpagina’s, wel /modellen + testshoot.
 */
export function NieuwDesktopGate({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const pathname = usePathname() ?? '/';
  const router = useRouter();

  useEffect(() => {
    if (isMobile !== true) return;
    if (allowMobilePath(pathname)) return;

    if (pathname.startsWith('/inloggen')) {
      router.replace('/?m=model');
      return;
    }

    const infoKey = INFO_REDIRECT[pathname];
    if (infoKey) {
      const wantsBook =
        typeof window !== 'undefined' &&
        (window.location.hash === '#agenda' || window.location.search.includes('book=1'));
      const bookKey = BOOK_FROM_INFO[infoKey];
      if (wantsBook && bookKey) {
        router.replace(`/?m=guest&book=${bookKey}`);
        return;
      }
      router.replace(`/?m=guest&info=${infoKey}`);
      return;
    }

    if (pathname.startsWith('/gasten')) {
      router.replace('/?m=guest');
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
