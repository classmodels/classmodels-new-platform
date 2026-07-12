'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const SHEET_BASE = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';
/** Film 30 — de lift in het onthaal, met vier ronde knoppen links. */
const VIDEO_INTRO = `${SHEET_BASE}/videos/intro-lift-v2.mp4`;
/** Film 31 — van de lift naar de hal van het gastenportaal (welkomstbord + deurbordjes). */
const VIDEO_HALL = `${SHEET_BASE}/videos/guest-hall.mp4`;
/** Film 32 — de castingzaal. */
const VIDEO_CASTING = `${SHEET_BASE}/videos/casting-room.mp4`;
/** Film 33 — de intakegesprek-kamer. */
const VIDEO_INTAKE = `${SHEET_BASE}/videos/intake-room.mp4`;

/** Alle hotspot-coördinaten zijn gemeten in dit 1280x720-stelsel (films zijn 16:9). */
const BASE_W = 1280;
const BASE_H = 720;
/** Het beeld op 80% van de sitebreedte — zo blijft er boven/onder niets afgekapt. */
const WIDTH_FRACTION = 0.8;

/** Duur van de fade naar zwart bij 'Exit room' (ms). */
const FADE_MS = 700;

type Phase =
  | 'intro' // film 30 speelt
  | 'lift' // eindbeeld film 30: liftknoppen klikbaar
  | 'hallRide' // film 31 speelt
  | 'hall' // eindbeeld film 31: deurbordjes klikbaar
  | 'castingRide' // film 32 speelt
  | 'casting' // eindbeeld film 32: exit room klikbaar
  | 'intakeRide' // film 33 speelt
  | 'intake'; // eindbeeld film 33: exit room klikbaar

type Hotspot = { label: string; x: number; y: number; w: number; h: number };

/**
 * Liftknoppen (eindbeeld film 30) — vier ronde knoppen links in de lift.
 * Alleen een handje bij hover, geen zichtbare overlay.
 */
const LIFT_BUTTONS: (Hotspot & { action: 'gallery' | 'model' | 'client' | 'guest' })[] = [
  { label: 'Modellen gallerij', x: 60, y: 136, w: 88, h: 88, action: 'gallery' },
  { label: 'Modellen portaal', x: 55, y: 264, w: 88, h: 88, action: 'model' },
  { label: 'Klanten portaal', x: 49, y: 390, w: 88, h: 88, action: 'client' },
  { label: 'Gasten portaal', x: 57, y: 510, w: 88, h: 88, action: 'guest' },
];

/** Bordjes boven de deur in de hal (eindbeeld film 31). */
const HALL_SIGNS: (Hotspot & {
  action: 'casting' | 'intake' | 'fotoshoot' | 'exit';
})[] = [
  { label: 'Exit room', x: 462, y: 158, w: 116, h: 42, action: 'exit' },
  { label: 'Intake-gesprek', x: 245, y: 211, w: 127, h: 40, action: 'intake' },
  { label: 'Gratis fotoshoot', x: 385, y: 212, w: 124, h: 40, action: 'fotoshoot' },
  { label: 'Casting', x: 522, y: 207, w: 129, h: 45, action: 'casting' },
];

/** Exit room-bordje in de castingzaal (eindbeeld film 32). */
const CASTING_EXIT: Hotspot = { label: 'Exit room', x: 1051, y: 122, w: 117, h: 45 };

/** Exit room-bordje in de intakekamer (eindbeeld film 33). */
const INTAKE_EXIT: Hotspot = { label: 'Exit room', x: 966, y: 342, w: 120, h: 44 };

/** Zet een (uitgespeelde of nog niet gestarte) video vast op het laatste beeld. */
function holdLastFrame(v: HTMLVideoElement | null) {
  if (!v) return;
  v.pause();
  if (Number.isFinite(v.duration) && v.duration > 0) {
    v.currentTime = Math.max(0, v.duration - 0.05);
  }
}

/**
 * Beginpagina: film 30 (lift) → eindbeeld met klikbare liftknoppen →
 * Gastenportaal start film 31 (hal) → op het eindbeeld zijn de deurbordjes klikbaar:
 * Casting → film 32, Intake gesprek → film 33, Gratis fotoshoot → eigen pagina.
 * 'Exit room' fadet naar zwart en fadet dan in op het eindbeeld van film 31.
 */
export function BeginLiftExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shellRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLVideoElement>(null);
  const hallRef = useRef<HTMLVideoElement>(null);
  const castingRef = useRef<HTMLVideoElement>(null);
  const intakeRef = useRef<HTMLVideoElement>(null);
  const fadeTimer = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [scale, setScale] = useState(1);
  /** Zwarte overlay voor de exit room-overgang: uitfaden → wisselen → infaden. */
  const [faded, setFaded] = useState(false);

  /**
   * 80% van de breedte, maar nooit hoger dan de ruimte onder de zwarte menubalk:
   * de film begint direct onder de balk en wordt onderaan niet afgekapt.
   */
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      const top = el.getBoundingClientRect().top;
      const availH = Math.max(300, window.innerHeight - Math.max(0, top));
      setScale(Math.min((w * WIDTH_FRACTION) / BASE_W, availH / BASE_H));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(
    () => () => {
      if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
    },
    [],
  );

  /** Autoplay kan geblokkeerd zijn; dan tonen we meteen het eindbeeld met de knoppen. */
  useEffect(() => {
    const v = introRef.current;
    if (!v) return;
    const p = v.play();
    if (p) {
      p.catch(() => {
        holdLastFrame(v);
        setPhase('lift');
      });
    }
  }, []);

  const startHall = useCallback(() => {
    introRef.current?.pause();
    setPhase('hallRide');
    const v = hallRef.current;
    if (v) {
      v.currentTime = 0;
      void v.play().catch(() => {
        holdLastFrame(v);
        setPhase('hall');
      });
    }
  }, []);

  const startCasting = useCallback(() => {
    setPhase('castingRide');
    const v = castingRef.current;
    if (v) {
      v.currentTime = 0;
      void v.play().catch(() => {
        holdLastFrame(v);
        setPhase('casting');
      });
    }
  }, []);

  const startIntake = useCallback(() => {
    setPhase('intakeRide');
    const v = intakeRef.current;
    if (v) {
      v.currentTime = 0;
      void v.play().catch(() => {
        holdLastFrame(v);
        setPhase('intake');
      });
    }
  }, []);

  /**
   * Exit room: de pagina fadet uit naar zwart en fadet daarna in op het
   * gevraagde eindbeeld (de hal van film 31, of de lift van film 30).
   */
  const fadeTo = useCallback((target: 'hall' | 'lift') => {
    setFaded(true);
    if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
    fadeTimer.current = window.setTimeout(() => {
      castingRef.current?.pause();
      intakeRef.current?.pause();
      if (target === 'hall') {
        holdLastFrame(hallRef.current);
        setPhase('hall');
      } else {
        holdLastFrame(introRef.current);
        setPhase('lift');
      }
      // Eén frame wachten zodat het nieuwe beeld al klaarstaat achter het zwart.
      fadeTimer.current = window.setTimeout(() => setFaded(false), 80);
    }, FADE_MS);
  }, []);

  /** `/?go=guest` (Gastenportaal in de menubalk) → meteen film 31: naar de hal. */
  const goParam = searchParams.get('go');
  useEffect(() => {
    if (goParam === 'guest') startHall();
  }, [goParam, startHall]);

  const onLiftButton = useCallback(
    (action: 'gallery' | 'model' | 'client' | 'guest') => {
      if (action === 'gallery') {
        router.push('/portal/model/modellenwand');
        return;
      }
      if (action === 'model') {
        router.push('/lobby?tab=model');
        return;
      }
      if (action === 'client') {
        router.push('/lobby?tab=client');
        return;
      }
      startHall();
    },
    [router, startHall],
  );

  const onHallSign = useCallback(
    (action: 'casting' | 'intake' | 'fotoshoot' | 'exit') => {
      if (action === 'casting') {
        startCasting();
        return;
      }
      if (action === 'intake') {
        startIntake();
        return;
      }
      if (action === 'fotoshoot') {
        router.push('/gratis-fotoshoot');
        return;
      }
      // Exit room in de hal: terug naar de lift (eindbeeld film 30).
      fadeTo('lift');
    },
    [router, startCasting, startIntake, fadeTo],
  );

  /** Onzichtbare klikvlakken: alleen een handje bij hover, geen zichtbare overlay. */
  const hotspotClass = 'absolute cursor-pointer bg-transparent outline-none';

  const videoClass = (visible: boolean) =>
    `absolute inset-0 h-full w-full select-none object-fill ${visible ? 'opacity-100' : 'opacity-0'}`;

  return (
    <div
      ref={shellRef}
      className="relative w-full overflow-hidden bg-black"
      style={{ height: Math.round(BASE_H * scale) }}
    >
      <div
        className="absolute left-1/2 top-0"
        style={{
          width: BASE_W,
          height: BASE_H,
          transform: `translateX(-50%) scale(${scale})`,
          transformOrigin: 'top center',
        }}
      >
        {/* Film 30 — de lift; blijft op het laatste beeld staan (geen controls). */}
        <video
          ref={introRef}
          src={VIDEO_INTRO}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          onEnded={() => setPhase('lift')}
          onContextMenu={(e) => e.preventDefault()}
          className={videoClass(phase === 'intro' || phase === 'lift')}
        />

        {/* Film 31 — naar de hal van het gastenportaal; blijft op het laatste beeld staan. */}
        <video
          ref={hallRef}
          src={VIDEO_HALL}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          onEnded={() => setPhase('hall')}
          onContextMenu={(e) => e.preventDefault()}
          className={videoClass(phase === 'hallRide' || phase === 'hall')}
        />

        {/* Film 32 — de castingzaal. */}
        <video
          ref={castingRef}
          src={VIDEO_CASTING}
          muted
          playsInline
          preload="none"
          disablePictureInPicture
          onEnded={() => setPhase('casting')}
          onContextMenu={(e) => e.preventDefault()}
          className={videoClass(phase === 'castingRide' || phase === 'casting')}
        />

        {/* Film 33 — de intakegesprek-kamer. */}
        <video
          ref={intakeRef}
          src={VIDEO_INTAKE}
          muted
          playsInline
          preload="none"
          disablePictureInPicture
          onEnded={() => setPhase('intake')}
          onContextMenu={(e) => e.preventDefault()}
          className={videoClass(phase === 'intakeRide' || phase === 'intake')}
        />

        {/* Liftknoppen — pas klikbaar op het eindbeeld van film 30. */}
        {phase === 'lift'
          ? LIFT_BUTTONS.map((b) => (
              <button
                key={b.label}
                type="button"
                aria-label={b.label}
                title={b.label}
                onClick={() => onLiftButton(b.action)}
                className={`${hotspotClass} rounded-full`}
                style={{ left: b.x, top: b.y, width: b.w, height: b.h }}
              />
            ))
          : null}

        {/* Deurbordjes in de hal — pas klikbaar op het eindbeeld van film 31. */}
        {phase === 'hall'
          ? HALL_SIGNS.map((s) => (
              <button
                key={s.label}
                type="button"
                aria-label={s.label}
                title={s.label}
                onClick={() => onHallSign(s.action)}
                className={hotspotClass}
                style={{ left: s.x, top: s.y, width: s.w, height: s.h }}
              />
            ))
          : null}

        {/* Exit room in de castingzaal — fade naar zwart, dan terug naar de hal. */}
        {phase === 'casting' ? (
          <button
            type="button"
            aria-label="Exit room"
            title="Exit room"
            onClick={() => fadeTo('hall')}
            className={hotspotClass}
            style={{
              left: CASTING_EXIT.x,
              top: CASTING_EXIT.y,
              width: CASTING_EXIT.w,
              height: CASTING_EXIT.h,
            }}
          />
        ) : null}

        {/* Exit room in de intakekamer — fade naar zwart, dan terug naar de hal. */}
        {phase === 'intake' ? (
          <button
            type="button"
            aria-label="Exit room"
            title="Exit room"
            onClick={() => fadeTo('hall')}
            className={hotspotClass}
            style={{
              left: INTAKE_EXIT.x,
              top: INTAKE_EXIT.y,
              width: INTAKE_EXIT.w,
              height: INTAKE_EXIT.h,
            }}
          />
        ) : null}
      </div>

      {/* Zwarte fade-overlay voor de exit room-overgang. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 bg-black"
        style={{
          opacity: faded ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease-in-out`,
        }}
      />
    </div>
  );
}
