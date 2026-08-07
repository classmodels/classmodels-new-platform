'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { MobileBeginHome } from '@/components/MobileBeginHome';
import {
  DESKTOP_INTRO_SEEN_KEY,
  DESKTOP_INTRO_VIDEO_SRC,
  hasSeenIntro,
  SiteIntroOverlay,
} from '@/components/SiteIntroOverlay';
import { useIsMobile } from '@/lib/use-is-mobile';

/**
 * Gsm → MobileBeginHome (eigen staande introfilm, alleen bij openen van site/app).
 * Desktop → website-homepage + liggende introfilm (alleen eerste openen van `/`).
 * Geen flits van de homepage vóór het filmpje: zwart tot de intro klaar is of overgeslagen.
 */
export function MobileHomeGate({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [showIntro, setShowIntro] = useState<boolean | null>(null);

  useEffect(() => {
    if (isMobile !== false) return;
    let cancelled = false;
    (async () => {
      if (hasSeenIntro(DESKTOP_INTRO_SEEN_KEY)) {
        if (!cancelled) setShowIntro(false);
        return;
      }
      try {
        const ctrl = new AbortController();
        const timer = window.setTimeout(() => ctrl.abort(), 2000);
        const res = await fetch(DESKTOP_INTRO_VIDEO_SRC, {
          method: 'HEAD',
          signal: ctrl.signal,
          cache: 'force-cache',
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
    return <div className="min-h-[100dvh] bg-black" aria-hidden />;
  }

  if (isMobile) return <MobileBeginHome />;

  // Desktop: wacht op intro-besluit — nooit homepage tonen vóór de film.
  if (showIntro === null) {
    return <div className="min-h-[100dvh] bg-black" aria-hidden />;
  }

  if (showIntro) {
    return (
      <SiteIntroOverlay
        onDone={onIntroDone}
        videoSrc={DESKTOP_INTRO_VIDEO_SRC}
        storageKey={DESKTOP_INTRO_SEEN_KEY}
      />
    );
  }

  return <>{children}</>;
}
