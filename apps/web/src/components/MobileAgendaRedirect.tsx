'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/lib/use-is-mobile';

/** Op gsm: #agenda → echte app-boekingsflow i.p.v. desktoppagina. */
export function MobileAgendaRedirect({ book }: { book: string }) {
  const isMobile = useIsMobile();
  const router = useRouter();

  useEffect(() => {
    if (isMobile !== true) return;
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#agenda') return;
    router.replace(`/?m=guest&book=${encodeURIComponent(book)}`);
  }, [isMobile, book, router]);

  return null;
}
