'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { MobileBeginHome } from '@/components/MobileBeginHome';
import {
  hasSeenSiteIntro,
  SiteIntroOverlay,
  SITE_INTRO_VIDEO_SRC,
} from '@/components/SiteIntroOverlay';
import { useIsMobile } from '@/lib/use-is-mobile';

/**
 * Gsm → MobileBeginHome (met eigen intro).
 * Desktop → website-homepage; introfilm alleen bij eerste openen van `/` in deze tab.
 */
export function MobileHomeGate({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [showIntro, setShowIntro] = useState<boolean | null>(null);

  useEffect(() => {
    if (isMobile !== false) return;
    let cancelled = false;
    (async () => {
      if (hasSeenSiteIntro()) {
        if (!cancelled) setShowIntro(false);
        return;
      }
      try {
        const ctrl = new AbortController();
        const timer = window.setTimeout(() => ctrl.abort(), 2000);
        const res = await fetch(SITE_INTRO_VIDEO_SRC, {
          method: 'HEAD',
          signal: ctrl.signal,
          cache: 'no-store',
        });
        window.clearTimeout(timer);
        if (!cancelled) setShowIntro(res.ok);
      } catch {
        if (!cancelled) setShowIntro(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isMobile]);

  const onIntroDone = useCallback(() => setShowIntro(false), []);

  if (isMobile === null) {
    return <div className="min-h-[100dvh] bg-[#f1eee8] md:bg-[#0d0d11]" aria-hidden />;
  }

  if (isMobile) return <MobileBeginHome />;

  return (
    <>
      {showIntro ? <SiteIntroOverlay onDone={onIntroDone} /> : null}
      {children}
    </>
  );
}
