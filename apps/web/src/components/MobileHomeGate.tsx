'use client';

import type { ReactNode } from 'react';
import { MobileBeginHome } from '@/components/MobileBeginHome';
import { useIsMobile } from '@/lib/use-is-mobile';

export function MobileHomeGate({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile === null) {
    return <div className="min-h-[100dvh] bg-[#f1eee8] md:bg-[#0d0d11]" aria-hidden />;
  }

  if (isMobile) return <MobileBeginHome />;

  return <>{children}</>;
}
