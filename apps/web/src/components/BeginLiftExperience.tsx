'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getApiBase } from '@/lib/api';
import {
  DOELGROEPEN_CARDS,
  DOELGROEPEN_INTRO,
  GUEST_FAQ,
  MODEL_WORDEN_STATS,
  WAAROM_CHECKLIST,
  WAAROM_PARAGRAPHS,
} from '@/components/guest-portal/guest-portal-data';

const SHEET_BASE = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';
/** Film 30 — de lift in het onthaal, met vier ronde knoppen links. */
const VIDEO_INTRO = `${SHEET_BASE}/videos/intro-lift-v2.mp4`;
/** Film 31 — van de lift naar de hal van het gastenportaal (welkomstbord + deurbordjes). */
const VIDEO_HALL = `${SHEET_BASE}/videos/guest-hall.mp4`;
/** Film 32 — de castingzaal. */
const VIDEO_CASTING = `${SHEET_BASE}/videos/casting-room.mp4`;
/** Film 33 — de intakegesprek-kamer. */
const VIDEO_INTAKE = `${SHEET_BASE}/videos/intake-room.mp4`;
/** Film 34 — de infozaal (bioscoop) achter 'Info model worden'. */
const VIDEO_INFO = `${SHEET_BASE}/videos/info-model-room.mp4`;
/** Film 61 — de trailer die met geluid op het grote scherm van de infozaal speelt. */
const VIDEO_TRAILER = `${SHEET_BASE}/videos/info-trailer.mp4`;
/** Infozaal met gedoofd licht (2.png) en met het licht aan (3.png). */
const IMG_INFO_DARK = `${SHEET_BASE}/images/info-room-dark.jpg`;
const IMG_INFO_LIGHT = `${SHEET_BASE}/images/info-room-light.jpg`;

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
  | 'intake' // eindbeeld film 33: exit room klikbaar
  | 'infoRide' // film 34 speelt
  | 'infoDim' // licht dooft (2.png) en film 61 speelt met geluid op het grote scherm
  | 'info'; // licht weer aan (3.png): bordjes klikbaar, content op het grote scherm

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
  action: 'info' | 'casting' | 'intake' | 'fotoshoot' | 'exit';
})[] = [
  { label: 'Info model worden', x: 300, y: 160, w: 135, h: 38, action: 'info' },
  { label: 'Exit room', x: 462, y: 158, w: 116, h: 42, action: 'exit' },
  { label: 'Intake-gesprek', x: 245, y: 211, w: 127, h: 40, action: 'intake' },
  { label: 'Gratis fotoshoot', x: 385, y: 212, w: 124, h: 40, action: 'fotoshoot' },
  { label: 'Casting', x: 522, y: 207, w: 129, h: 45, action: 'casting' },
];

/** Exit room-bordje in de castingzaal (eindbeeld film 32). */
const CASTING_EXIT: Hotspot = { label: 'Exit room', x: 1051, y: 122, w: 117, h: 45 };

/** Exit room-bordje in de intakekamer (eindbeeld film 33). */
const INTAKE_EXIT: Hotspot = { label: 'Exit room', x: 966, y: 342, w: 120, h: 44 };

/** Onderwerpen van de bordjes op de zijmuren van de infozaal. */
type InfoTopic =
  | 'veelgestelde-vragen'
  | 'doelgroepen'
  | 'info-model-worden'
  | 'reviews'
  | 'onze-klanten'
  | 'trailers';

/**
 * Bordjes op de zijmuren van de infozaal (2.png/3.png, zelfde kadrering als
 * het eindbeeld van film 34). Ten allen tijde klikbaar; de inhoud verschijnt
 * op het grote scherm.
 */
const INFO_SIGNS: (Hotspot & { action: InfoTopic | 'exit' })[] = [
  { label: 'Exit room', x: 160, y: 148, w: 109, h: 35, action: 'exit' },
  { label: 'Veel gestelde vragen', x: 160, y: 215, w: 109, h: 54, action: 'veelgestelde-vragen' },
  { label: 'Doelgroepen', x: 160, y: 306, w: 109, h: 42, action: 'doelgroepen' },
  { label: 'Info model worden', x: 160, y: 385, w: 109, h: 35, action: 'info-model-worden' },
  { label: 'Reviews', x: 994, y: 150, w: 112, h: 38, action: 'reviews' },
  { label: 'Onze klanten', x: 994, y: 235, w: 112, h: 40, action: 'onze-klanten' },
  { label: 'Trailers try-out modeshows', x: 994, y: 315, w: 112, h: 85, action: 'trailers' },
];

/** Het grote bioscoopdoek in de infozaal (1280x720-stelsel, gemeten op 3.png). */
const INFO_SCREEN = { x: 372, y: 152, w: 534, h: 288 };
/** 2x supersampling: content groot renderen en terugschalen → scherpe tekst op het doek. */
const INFO_SCREEN_SS = 2;

type InfoReview = {
  id: string;
  title: string;
  body: string;
  authorName?: string | null;
  rating?: number | null;
};

/** Zet een (uitgespeelde of nog niet gestarte) video vast op het laatste beeld. */
function holdLastFrame(v: HTMLVideoElement | null) {
  if (!v) return;
  v.pause();
  if (Number.isFinite(v.duration) && v.duration > 0) {
    v.currentTime = Math.max(0, v.duration - 0.05);
  }
}

/** Kleuren voor de content op het bioscoopdoek — donkere inkt en goud op het lichte doek. */
const SCREEN_INK = '#2a2118';
const SCREEN_GOLD = '#8a6b45';

function ScreenHeading({ title }: { title: string }) {
  return (
    <header className="shrink-0">
      <h2 className="m-0 font-serif font-semibold leading-tight" style={{ fontSize: 52, color: SCREEN_INK }}>
        {title}
      </h2>
      <span
        aria-hidden
        className="mt-3 block h-[3px] w-44"
        style={{ background: `linear-gradient(to right, ${SCREEN_GOLD}, transparent)` }}
      />
    </header>
  );
}

/** Inhoud op het grote bioscoopdoek — dezelfde teksten als elders op de site. */
function InfoScreenContent({ topic, reviews }: { topic: InfoTopic; reviews: InfoReview[] | null }) {
  switch (topic) {
    case 'info-model-worden':
      return (
        <div>
          <ScreenHeading title="Model worden bij Class-Models" />
          {WAAROM_PARAGRAPHS.map((p) => (
            <p key={p} className="m-0 mt-5 font-sans leading-relaxed" style={{ fontSize: 26, color: SCREEN_INK }}>
              {p}
            </p>
          ))}
          <ul className="m-0 mt-6 list-none space-y-3 p-0">
            {WAAROM_CHECKLIST.map((b) => (
              <li key={b} className="flex gap-3 font-sans leading-snug" style={{ fontSize: 25, color: SCREEN_INK }}>
                <span aria-hidden style={{ color: SCREEN_GOLD }}>
                  ◆
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-7 grid grid-cols-4 gap-4">
            {MODEL_WORDEN_STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-lg px-3 py-4 text-center"
                style={{
                  background: 'linear-gradient(180deg, #3a2e20, #241d15)',
                  border: '1px solid rgba(190,150,95,0.55)',
                }}
              >
                <p className="m-0 font-serif font-bold" style={{ fontSize: 30, color: '#ffe9c4' }}>
                  {s.value}
                </p>
                <p className="m-0 mt-1 font-sans" style={{ fontSize: 17, color: 'rgba(255,233,196,0.85)' }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    case 'veelgestelde-vragen':
      return (
        <div>
          <ScreenHeading title="Veelgestelde vragen" />
          <div className="mt-6 space-y-6">
            {GUEST_FAQ.map((f) => (
              <section key={f.q}>
                <h3 className="m-0 font-serif font-semibold" style={{ fontSize: 30, color: SCREEN_INK }}>
                  {f.q}
                </h3>
                <p className="m-0 mt-2 font-sans leading-snug" style={{ fontSize: 25, color: '#4a4033' }}>
                  {f.a}
                </p>
              </section>
            ))}
          </div>
        </div>
      );
    case 'doelgroepen':
      return (
        <div>
          <ScreenHeading title="Doelgroepen" />
          <p className="m-0 mt-5 font-sans leading-relaxed" style={{ fontSize: 26, color: SCREEN_INK }}>
            {DOELGROEPEN_INTRO}
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4">
            {DOELGROEPEN_CARDS.map((c) => (
              <div
                key={c.title}
                className="rounded-lg px-4 py-4"
                style={{ background: 'rgba(138,107,69,0.10)', border: '1px solid rgba(138,107,69,0.4)' }}
              >
                <p className="m-0 font-serif font-semibold" style={{ fontSize: 26, color: SCREEN_INK }}>
                  {c.title}
                </p>
                <p className="m-0 mt-1.5 font-sans leading-snug" style={{ fontSize: 20, color: '#4a4033' }}>
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    case 'reviews':
      return (
        <div>
          <ScreenHeading title="Hoe onze modellen hun avontuur ervaren" />
          {reviews === null ? (
            <p className="m-0 mt-6 font-sans" style={{ fontSize: 25, color: '#4a4033' }}>
              Reviews laden…
            </p>
          ) : reviews.length === 0 ? (
            <p className="m-0 mt-6 font-sans" style={{ fontSize: 25, color: '#4a4033' }}>
              Nog geen reviews beschikbaar.
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4">
              {reviews.map((r) => (
                <article
                  key={r.id}
                  className="rounded-lg px-4 py-4"
                  style={{ background: 'rgba(138,107,69,0.10)', border: '1px solid rgba(138,107,69,0.4)' }}
                >
                  <h3 className="m-0 font-serif font-semibold" style={{ fontSize: 24, color: SCREEN_INK }}>
                    {r.title}
                  </h3>
                  <p className="m-0 mt-1.5 font-sans leading-snug" style={{ fontSize: 19, color: '#4a4033' }}>
                    {r.body}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {r.authorName ? (
                      <p className="m-0 font-sans font-semibold" style={{ fontSize: 18, color: SCREEN_INK }}>
                        — {r.authorName}
                      </p>
                    ) : (
                      <span />
                    )}
                    {r.rating ? (
                      <span aria-label={`${r.rating} van 5 sterren`} style={{ fontSize: 19, color: '#b98a2f' }}>
                        {'★'.repeat(Math.min(5, Math.max(0, r.rating)))}
                        <span style={{ color: 'rgba(138,107,69,0.35)' }}>
                          {'★'.repeat(5 - Math.min(5, Math.max(0, r.rating)))}
                        </span>
                      </span>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      );
    case 'onze-klanten':
      return (
        <div>
          <ScreenHeading title="Onze klanten" />
          <p className="m-0 mt-5 font-sans leading-relaxed" style={{ fontSize: 26, color: SCREEN_INK }}>
            Onze modellen werken voor uiteenlopende merken en klanten: campagnes, fotoshoots,
            reclame, events en modeshows. Van lokale zaken tot grote namen — voor elke opdracht
            zoeken we het profiel dat er het best bij past.
          </p>
          <p className="m-0 mt-4 font-sans leading-relaxed" style={{ fontSize: 26, color: SCREEN_INK }}>
            Bent u zelf op zoek naar modellen voor uw merk of evenement? Via het klantenportaal
            plaatst u eenvoudig een aanvraag en stellen wij een selectie voor die aansluit bij uw
            campagne.
          </p>
          <ul className="m-0 mt-6 list-none space-y-3 p-0">
            {[
              'Campagnes en reclame voor merken en winkels',
              'Fotoshoots voor catalogi, webshops en social media',
              'Events, beurzen en productlanceringen',
              'Modeshows en try-outs',
            ].map((b) => (
              <li key={b} className="flex gap-3 font-sans leading-snug" style={{ fontSize: 25, color: SCREEN_INK }}>
                <span aria-hidden style={{ color: SCREEN_GOLD }}>
                  ◆
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case 'trailers':
      return (
        <div>
          <ScreenHeading title="Trailers — try-out modeshows" />
          <p className="m-0 mt-5 font-sans leading-relaxed" style={{ fontSize: 26, color: SCREEN_INK }}>
            Onze modellen schitteren op try-out modeshows: een echte show met publiek, styling en
            professionele begeleiding. De trailer speelt op dit scherm — klik op het bordje
            &lsquo;Trailers try-out modeshows&rsquo; om hem (opnieuw) te bekijken.
          </p>
          <p className="m-0 mt-4 font-sans leading-relaxed" style={{ fontSize: 26, color: SCREEN_INK }}>
            Zin om zelf mee te lopen? Boek een intakegesprek of doe mee aan de casting — de
            bordjes vind je in de hal van het gastenportaal.
          </p>
        </div>
      );
  }
}

/**
 * Beginpagina: film 30 (lift) → eindbeeld met klikbare liftknoppen →
 * Gastenportaal start film 31 (hal) → op het eindbeeld zijn de deurbordjes klikbaar:
 * Info model worden → film 34, Casting → film 32, Intake gesprek → film 33,
 * Gratis fotoshoot → eigen pagina. 'Exit room' fadet naar zwart en fadet dan
 * altijd in op het eindbeeld van film 31 — nooit terug naar de beginpagina.
 */
export function BeginLiftExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shellRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLVideoElement>(null);
  const hallRef = useRef<HTMLVideoElement>(null);
  const castingRef = useRef<HTMLVideoElement>(null);
  const intakeRef = useRef<HTMLVideoElement>(null);
  const infoRef = useRef<HTMLVideoElement>(null);
  const trailerRef = useRef<HTMLVideoElement>(null);
  const fadeTimer = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [scale, setScale] = useState(1);
  /** Zwarte overlay voor de exit room-overgang: uitfaden → wisselen → infaden. */
  const [faded, setFaded] = useState(false);
  /** Gekozen onderwerp op het grote scherm van de infozaal. */
  const [infoTopic, setInfoTopic] = useState<InfoTopic>('info-model-worden');
  /** Geluid van de trailer (film 61) — knop onderaan in het zwarte gedeelte. */
  const [trailerMuted, setTrailerMuted] = useState(false);
  const [reviews, setReviews] = useState<InfoReview[] | null>(null);

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
   * Na film 34 dooft het licht (2.png) en speelt film 61 direct met geluid op
   * het grote scherm. Lukt afspelen met geluid niet (autoplay-beleid), dan
   * starten we gedempt en kan het geluid met de knop weer aan.
   */
  const startTrailer = useCallback(() => {
    setPhase('infoDim');
    const v = trailerRef.current;
    if (!v) {
      setPhase('info');
      return;
    }
    v.currentTime = 0;
    v.muted = false;
    setTrailerMuted(false);
    void v.play().catch(() => {
      v.muted = true;
      setTrailerMuted(true);
      void v.play().catch(() => setPhase('info'));
    });
  }, []);

  const startInfo = useCallback(() => {
    setPhase('infoRide');
    const v = infoRef.current;
    if (v) {
      v.currentTime = 0;
      void v.play().catch(() => {
        // Film 34 kan niet spelen → meteen door naar de trailer in de donkere zaal.
        startTrailer();
      });
    }
  }, [startTrailer]);

  /** Reviews pas ophalen wanneer het onderwerp voor het eerst gekozen wordt. */
  useEffect(() => {
    if (infoTopic !== 'reviews' || reviews !== null) return;
    fetch(`${getApiBase()}/reviews`, { cache: 'no-store' })
      .then(async (r) => (r.ok ? r.json() : []))
      .then((data: unknown) => setReviews(Array.isArray(data) ? (data as InfoReview[]) : []))
      .catch(() => setReviews([]));
  }, [infoTopic, reviews]);

  /**
   * Exit room: de pagina fadet uit naar zwart en fadet daarna altijd in op het
   * eindbeeld van film 31 (de hal). Er wordt nooit teruggegaan naar de
   * beginpagina — die zie je alleen bij het betreden van de site.
   */
  const fadeToHall = useCallback(() => {
    setFaded(true);
    if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
    fadeTimer.current = window.setTimeout(() => {
      castingRef.current?.pause();
      intakeRef.current?.pause();
      infoRef.current?.pause();
      trailerRef.current?.pause();
      holdLastFrame(hallRef.current);
      setPhase('hall');
      // Eén frame wachten zodat het nieuwe beeld al klaarstaat achter het zwart.
      fadeTimer.current = window.setTimeout(() => setFaded(false), 80);
    }, FADE_MS);
  }, []);

  /** Bordjes op de zijmuren van de infozaal — ten allen tijde klikbaar. */
  const onInfoSign = useCallback(
    (action: InfoTopic | 'exit') => {
      if (action === 'exit') {
        trailerRef.current?.pause();
        fadeToHall();
        return;
      }
      if (action === 'trailers') {
        // Licht dooft en de trailer speelt (opnieuw) op het grote scherm.
        startTrailer();
        return;
      }
      trailerRef.current?.pause();
      setInfoTopic(action);
      setPhase('info');
    },
    [fadeToHall, startTrailer],
  );

  /** Direct naar het eindbeeld van film 31 springen (zonder de film af te spelen). */
  const jumpToHall = useCallback(() => {
    introRef.current?.pause();
    setPhase('hall');
    const v = hallRef.current;
    if (!v) return;
    if (Number.isFinite(v.duration) && v.duration > 0) {
      holdLastFrame(v);
    } else {
      v.addEventListener('loadedmetadata', () => holdLastFrame(v), { once: true });
    }
  }, []);

  /**
   * `/?go=guest` (Gastenportaal in de menubalk) → film 31 speelt naar de hal;
   * `/?go=hall` (exit room vanaf een andere pagina) → meteen het eindbeeld van film 31.
   */
  const goParam = searchParams.get('go');
  useEffect(() => {
    if (goParam === 'guest') startHall();
    else if (goParam === 'hall') jumpToHall();
  }, [goParam, startHall, jumpToHall]);

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
    (action: 'info' | 'casting' | 'intake' | 'fotoshoot' | 'exit') => {
      if (action === 'info') {
        startInfo();
        return;
      }
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
      // Exit room in de hal: nooit terug naar de beginpagina — de fade komt
      // gewoon weer uit op het eindbeeld van film 31.
      fadeToHall();
    },
    [router, startInfo, startCasting, startIntake, fadeToHall],
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

        {/* Film 34 — de infozaal (Info model worden); daarna dooft het licht. */}
        <video
          ref={infoRef}
          src={VIDEO_INFO}
          muted
          playsInline
          preload="none"
          disablePictureInPicture
          onEnded={startTrailer}
          onContextMenu={(e) => e.preventDefault()}
          className={videoClass(phase === 'infoRide' || phase === 'infoDim' || phase === 'info')}
        />

        {/* Infozaal met gedoofd licht (2.png) — fadet in over het eindbeeld van film 34. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={IMG_INFO_DARK}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
          style={{ opacity: phase === 'infoDim' ? 1 : 0, transition: 'opacity 900ms ease-in-out' }}
        />

        {/* Infozaal met het licht aan (3.png) — fadet in als de trailer gedaan is. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={IMG_INFO_LIGHT}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
          style={{ opacity: phase === 'info' ? 1 : 0, transition: 'opacity 900ms ease-in-out' }}
        />

        {/* Film 61 — de trailer, met geluid, op het grote scherm in de donkere zaal. */}
        <video
          ref={trailerRef}
          src={VIDEO_TRAILER}
          playsInline
          preload="auto"
          disablePictureInPicture
          onEnded={() => setPhase('info')}
          onContextMenu={(e) => e.preventDefault()}
          className={`absolute select-none object-fill ${phase === 'infoDim' ? 'opacity-100' : 'opacity-0'}`}
          style={{
            left: INFO_SCREEN.x,
            top: INFO_SCREEN.y,
            width: INFO_SCREEN.w,
            height: INFO_SCREEN.h,
            transition: 'opacity 900ms ease-in-out',
            pointerEvents: 'none',
          }}
        />

        {/* Content op het grote scherm — als het licht weer aan is. */}
        {phase === 'info' ? (
          <div
            className="absolute"
            style={{ left: INFO_SCREEN.x, top: INFO_SCREEN.y, width: INFO_SCREEN.w, height: INFO_SCREEN.h }}
          >
            {/*
              Bron 2x zo groot gerenderd (supersampling) en teruggeschaald →
              gestoken scherpe tekst op het doek. Scrollen kan op het doek zelf.
            */}
            <div
              key={infoTopic}
              className="overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{
                width: INFO_SCREEN.w * INFO_SCREEN_SS,
                height: INFO_SCREEN.h * INFO_SCREEN_SS,
                transform: `scale(${1 / INFO_SCREEN_SS})`,
                transformOrigin: '0 0',
                padding: '34px 46px 40px',
                animation: 'beginScreenFade 480ms ease-out',
              }}
            >
              <InfoScreenContent topic={infoTopic} reviews={reviews} />
            </div>
          </div>
        ) : null}

        {/* Bordjes op de zijmuren van de infozaal — ten allen tijde klikbaar. */}
        {phase === 'infoDim' || phase === 'info'
          ? INFO_SIGNS.map((s) => (
              <button
                key={s.label}
                type="button"
                aria-label={s.label}
                title={s.label}
                onClick={() => onInfoSign(s.action)}
                className={hotspotClass}
                style={{ left: s.x, top: s.y, width: s.w, height: s.h, zIndex: 10 }}
              />
            ))
          : null}

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
            onClick={fadeToHall}
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
            onClick={fadeToHall}
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

      {/* Geluidsknop voor de trailer — buiten het beeld, onderaan in het zwarte gedeelte. */}
      {phase === 'infoDim' ? (
        <button
          type="button"
          onClick={() => {
            const v = trailerRef.current;
            if (!v) return;
            const next = !v.muted;
            v.muted = next;
            setTrailerMuted(next);
          }}
          className="absolute bottom-3 left-4 z-30 cursor-pointer rounded-full px-4 py-1.5 font-sans transition hover:opacity-85"
          style={{
            fontSize: 13,
            color: '#e9c780',
            background: 'rgba(20,16,12,0.85)',
            border: '1px solid rgba(233,199,128,0.5)',
            letterSpacing: '0.04em',
          }}
        >
          {trailerMuted ? '🔇 Geluid aan' : '🔊 Geluid uit'}
        </button>
      ) : null}

      {/* Zwarte fade-overlay voor de exit room-overgang. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 bg-black"
        style={{
          opacity: faded ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease-in-out`,
        }}
      />

      <style>{`
        @keyframes beginScreenFade {
          from { opacity: 0; transform: scale(${1 / INFO_SCREEN_SS}) translateY(10px); }
          to { opacity: 1; transform: scale(${1 / INFO_SCREEN_SS}) translateY(0); }
        }
      `}</style>
    </div>
  );
}
