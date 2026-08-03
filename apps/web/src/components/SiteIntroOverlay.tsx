'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const ASSET_BASE = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';

/** Alleen bij eerste openen van de site in deze browsertab — niet bij terug naar begin. */
export const SITE_INTRO_SEEN_KEY = 'cm-site-intro-seen';
/** Oude sleutel (gsm) — mee laten tellen zodat film niet opnieuw speelt. */
const LEGACY_INTRO_SEEN_KEY = 'cm-mobile-intro-seen';

export function hasSeenSiteIntro(): boolean {
  try {
    return (
      sessionStorage.getItem(SITE_INTRO_SEEN_KEY) === '1' ||
      sessionStorage.getItem(LEGACY_INTRO_SEEN_KEY) === '1'
    );
  } catch {
    return true;
  }
}

export function markSiteIntroSeen(): void {
  try {
    sessionStorage.setItem(SITE_INTRO_SEEN_KEY, '1');
    sessionStorage.setItem(LEGACY_INTRO_SEEN_KEY, '1');
  } catch {
    /**/
  }
}

export const SITE_INTRO_VIDEO_SRC = `${ASSET_BASE}/videos/mobile-intro.mp4`;

/**
 * Introfilm fullscreen bij eerste bezoek aan de startpagina.
 * Speelt volledig af (of Overslaan). Fail-safe alleen als afspelen nooit start.
 */
export function SiteIntroOverlay({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fading, setFading] = useState(false);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    markSiteIntroSeen();
    setFading(true);
    window.setTimeout(onDone, 550);
  }, [onDone]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let started = false;
    // Alleen afbreken als de film nooit begint (404 / autoplay-blokkade) — niet na 3s knippen.
    const failSafe = window.setTimeout(() => {
      if (!started) finish();
    }, 5000);
    const onPlaying = () => {
      started = true;
      window.clearTimeout(failSafe);
    };
    const onErr = () => finish();
    v.muted = true;
    v.addEventListener('playing', onPlaying);
    v.addEventListener('error', onErr);
    const p = v.play();
    if (p) p.catch(() => finish());
    return () => {
      window.clearTimeout(failSafe);
      v.removeEventListener('playing', onPlaying);
      v.removeEventListener('error', onErr);
    };
  }, [finish]);

  return (
    <div
      className={`fixed inset-0 z-[999] flex items-center justify-center bg-black transition-opacity duration-500 ${
        fading ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <video
        ref={videoRef}
        src={SITE_INTRO_VIDEO_SRC}
        className="h-full w-full object-contain"
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        onEnded={finish}
        onError={finish}
      />
      <button
        type="button"
        onClick={finish}
        className="absolute bottom-6 right-4 z-[1000] rounded-full px-4 py-2 text-[13px] font-semibold"
        style={{
          color: '#f3ead8',
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(243,234,216,0.45)',
        }}
      >
        Overslaan ≫
      </button>
    </div>
  );
}
