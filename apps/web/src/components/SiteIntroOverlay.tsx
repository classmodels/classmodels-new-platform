'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const ASSET_BASE = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';

/** Desktop/website: eerste openen van `/` in deze tab. */
export const DESKTOP_INTRO_SEEN_KEY = 'cm-desktop-intro-seen';
/** Gsm/app: eerste openen van de site/app in deze tab — niet bij terug naar begin. */
export const MOBILE_INTRO_SEEN_KEY = 'cm-mobile-intro-seen';
/** Oude gedeelde sleutel (vóór split desktop/gsm). */
const LEGACY_SITE_INTRO_SEEN_KEY = 'cm-site-intro-seen';

export const DESKTOP_INTRO_VIDEO_SRC = `${ASSET_BASE}/videos/desktop-intro.mp4`;
export const MOBILE_INTRO_VIDEO_SRC = `${ASSET_BASE}/videos/mobile-intro.mp4`;

export function hasSeenIntro(storageKey: string): boolean {
  try {
    if (sessionStorage.getItem(storageKey) === '1') return true;
    // Eén keer gedeelde legacy-sleutel respecteren, daarna per toestel apart.
    if (sessionStorage.getItem(LEGACY_SITE_INTRO_SEEN_KEY) === '1') return true;
    return false;
  } catch {
    return true;
  }
}

export function markIntroSeen(storageKey: string): void {
  try {
    sessionStorage.setItem(storageKey, '1');
  } catch {
    /**/
  }
}

type SiteIntroOverlayProps = {
  onDone: () => void;
  /** Pad naar de film (desktop of gsm). */
  videoSrc: string;
  /** sessionStorage-sleutel: film speelt niet opnieuw in dezelfde tab. */
  storageKey: string;
};

/**
 * Introfilm fullscreen bij eerste openen.
 * Speelt volledig af (of Overslaan). Fail-safe alleen als afspelen nooit start.
 */
export function SiteIntroOverlay({ onDone, videoSrc, storageKey }: SiteIntroOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fading, setFading] = useState(false);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    markIntroSeen(storageKey);
    setFading(true);
    window.setTimeout(onDone, 550);
  }, [onDone, storageKey]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let started = false;
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
        src={videoSrc}
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
