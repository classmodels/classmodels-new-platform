'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  quadMatrix3d,
  type Quad,
} from '@/components/model-portal/model-gallery-3d/quadTransform';
import {
  CARD_MODEL_WORDEN,
  CASTING_PAGE,
  DOELGROEPEN_CARDS,
  DOELGROEPEN_INTRO,
  GRATIS_FOTOSHOOT_PAGE,
  GUEST_FAQ,
  INTAKE_GESPREK_PAGE,
  MODEL_WORDEN_STATS,
  WAAROM_CHECKLIST,
  WAAROM_PARAGRAPHS,
} from '@/components/guest-portal/guest-portal-data';
import { GuestBookingPanel } from '@/components/guest-portal/GuestBookingPanel';
import { GuestContactSection } from '@/components/guest-portal/GuestContactSection';

const SHEET_BASE = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';
const VIDEO_INTRO = `${SHEET_BASE}/videos/intro-lift.mp4`;
const VIDEO_DESK = `${SHEET_BASE}/videos/lift-to-desk.mp4`;
const VIDEO_TV = `${SHEET_BASE}/videos/tv-loop.mp4`;

/** Beide films zijn 1280x720; alle hotspot/muur-coördinaten zijn in dit stelsel gemeten. */
const BASE_W = 1280;
const BASE_H = 720;
/** Het beeld op 80% van de sitebreedte — zo blijft er boven/onder niets afgekapt. */
const WIDTH_FRACTION = 0.8;

type Phase = 'intro' | 'lift' | 'ride' | 'desk';

type MenuId =
  | 'model-worden'
  | 'gratis-fotoshoot'
  | 'casting'
  | 'intake-gesprek'
  | 'doelgroepen'
  | 'veelgestelde-vragen'
  | 'testshoot';

/**
 * Liftknoppen (eindbeeld film 1) — drie ronde knoppen links in de lift.
 * Modellen/Klanten gaan (in afwachting) naar de oude enterpagina met login/registratie;
 * Gasten start film 100 richting de receptie.
 */
const LIFT_BUTTONS: { label: string; x: number; y: number; w: number; h: number; action: 'model' | 'client' | 'guest' }[] = [
  { label: 'Modellen portaal', x: 50, y: 128, w: 100, h: 118, action: 'model' },
  { label: 'Klanten portaal', x: 50, y: 262, w: 100, h: 118, action: 'client' },
  { label: 'Gasten portaal', x: 50, y: 408, w: 100, h: 118, action: 'guest' },
];

/**
 * Tv op de muur in de receptie (eindbeeld film 100) — daar speelt de promofilm in loop.
 * De quad dekt het volledige toestel; eromheen tekenen we een zwart kader (bezel)
 * met onderaan in het midden een klein stand-by lampje.
 */
const TV_QUAD: Quad = {
  tl: [339, 189],
  tr: [531, 214],
  br: [531, 349],
  bl: [339, 338],
};
const TV_SRC_W = 320;
const TV_SRC_H = 196;
/** Bezel-diktes in bronpixels: zijkanten/boven smal, onderaan iets breder voor het lampje. */
const TV_BEZEL_X = 10;
const TV_BEZEL_TOP = 8;
const TV_BEZEL_BOTTOM = 14;

/** Menu-items op de desk (eindbeeld film 100) — klikzones over de geschilderde knoppen. */
const DESK_MENU: { id: MenuId; label: string; x: number; y: number; w: number; h: number }[] = [
  { id: 'model-worden', label: 'Model worden', x: 58, y: 275, w: 150, h: 44 },
  { id: 'gratis-fotoshoot', label: 'Gratis fotoshoot', x: 63, y: 319, w: 150, h: 42 },
  { id: 'casting', label: 'Casting', x: 68, y: 361, w: 150, h: 42 },
  { id: 'intake-gesprek', label: 'Intake gesprek', x: 75, y: 403, w: 148, h: 41 },
  { id: 'doelgroepen', label: 'Doelgroepen', x: 81, y: 444, w: 147, h: 41 },
  { id: 'veelgestelde-vragen', label: 'Veelgestelde vragen', x: 88, y: 485, w: 145, h: 40 },
  { id: 'testshoot', label: 'Testshoot', x: 93, y: 525, w: 143, h: 42 },
];

/**
 * Rechtermuur (wit paneel in zwart kader, eindbeeld film 100) — opgemeten randen:
 * binnenkant paneel x 656..1223; bovenlijn y = 88 − 0.055·(x−656); onderlijn y = 618.7 + 0.0525·(x−656).
 * Content-quad iets naar binnen zodat de tekst ruim binnen de gouden bies blijft.
 */
const WALL_TOP = (x: number) => 88 - 0.055 * (x - 656);
const WALL_BOTTOM = (x: number) => 618.7 + 0.0525 * (x - 656);
const WALL_X0 = 684;
const WALL_X1 = 1196;
const WALL_QUAD: Quad = {
  tl: [WALL_X0, WALL_TOP(WALL_X0) + 16],
  tr: [WALL_X1, WALL_TOP(WALL_X1) + 16],
  br: [WALL_X1, WALL_BOTTOM(WALL_X1) - 16],
  bl: [WALL_X0, WALL_BOTTOM(WALL_X0) - 16],
};
/** Bronrechthoek van het muurpaneel (px) — tekstgroottes zijn hierop afgestemd. */
const WALL_SRC_W = 512;
const WALL_SRC_H = 520;

const GOLD = '#8a6b45';
const INK = '#211a13';

function WallHeading({ kicker, title }: { kicker?: string; title: string }) {
  return (
    <header>
      {kicker ? (
        <p
          className="m-0 font-sans uppercase"
          style={{ fontSize: 11, letterSpacing: '0.22em', color: GOLD }}
        >
          {kicker}
        </p>
      ) : null}
      <h2
        className="m-0 font-serif font-semibold leading-tight"
        style={{ fontSize: 26, color: INK, marginTop: kicker ? 6 : 0 }}
      >
        {title}
      </h2>
      <span
        aria-hidden
        className="mt-3 block h-px w-24"
        style={{ background: `linear-gradient(to right, ${GOLD}, transparent)` }}
      />
    </header>
  );
}

function WallBullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="m-0 mt-4 list-none space-y-2.5 p-0">
      {items.map((b) => (
        <li key={b} className="flex gap-2.5 font-sans leading-snug" style={{ fontSize: 14, color: '#3d3428' }}>
          <span aria-hidden style={{ color: GOLD }}>
            ◆
          </span>
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

/** Actieknop op de muur — opent bv. de online agenda direct op ditzelfde paneel. */
function WallCta({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-5 block w-full cursor-pointer rounded-md py-3 text-center font-sans font-semibold text-white transition hover:opacity-90"
      style={{ fontSize: 14.5, background: '#6f121b' }}
    >
      {label}
    </button>
  );
}

/** Kleine link naar het gastenportaal (alleen waar inloggen nodig is). */
function WallPortalLink({ href, label }: { href: string; label: string }) {
  return (
    <p className="m-0 mt-3 text-center font-sans" style={{ fontSize: 12.5, color: '#6b5c48' }}>
      <Link href={href} className="underline underline-offset-2 hover:opacity-80" style={{ color: GOLD }}>
        {label}
      </Link>
    </p>
  );
}

function WallStats() {
  return (
    <div className="mt-6 grid grid-cols-4 gap-2.5">
      {MODEL_WORDEN_STATS.map((s) => (
        <div key={s.label} className="rounded-md px-2 py-2.5 text-center" style={{ background: '#6f121b' }}>
          <p className="m-0 font-serif font-bold text-white" style={{ fontSize: 17 }}>
            {s.value}
          </p>
          <p className="m-0 mt-0.5 font-sans font-semibold text-white/90" style={{ fontSize: 9.5 }}>
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Welkomsttekst op de muur — zelfde layout, tekst verschijnt snel alsof getypt. */
const WELCOME_TYPING_MS = 18;

type WelcomeBlock = {
  id: string;
  text: string;
};

const WELCOME_BLOCKS: WelcomeBlock[] = [
  { id: 'kicker', text: 'Class-Models' },
  { id: 'title', text: 'Welkom in het\ngastenportaal' },
  {
    id: 'body1',
    text: 'Hier vind je alle informatie over model worden en boek je meteen een afspraak voor een gratis fotoshoot, een casting of een vrijblijvend intakegesprek.',
  },
  {
    id: 'body2',
    text: 'Kies links op de balie een onderwerp uit het menubord — de inhoud verschijnt hier op de muur.',
  },
];

function WallWelcome() {
  const [blockIdx, setBlockIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const current = WELCOME_BLOCKS[blockIdx];
  const allDone = blockIdx >= WELCOME_BLOCKS.length - 1 && charIdx >= (current?.text.length ?? 0);

  useEffect(() => {
    if (!current) return;
    if (charIdx < current.text.length) {
      const t = window.setTimeout(() => setCharIdx((c) => c + 1), WELCOME_TYPING_MS);
      return () => window.clearTimeout(t);
    }
    if (blockIdx < WELCOME_BLOCKS.length - 1) {
      const t = window.setTimeout(() => {
        setBlockIdx((b) => b + 1);
        setCharIdx(0);
      }, 90);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [blockIdx, charIdx, current]);

  const visibleFor = (index: number) => {
    if (index < blockIdx) return WELCOME_BLOCKS[index].text;
    if (index === blockIdx) return WELCOME_BLOCKS[index].text.slice(0, charIdx);
    return '';
  };

  const showCursor = (index: number) => index === blockIdx && charIdx < WELCOME_BLOCKS[index].text.length;

  const renderWithBreaks = (text: string, cursor: boolean) => {
    const parts = text.split('\n');
    return (
      <>
        {parts.map((part, i) => (
          <span key={i}>
            {i > 0 ? <br /> : null}
            {part}
          </span>
        ))}
        {cursor ? (
          <span className="inline-block w-[2px] animate-pulse" style={{ color: GOLD }} aria-hidden>
            |
          </span>
        ) : null}
      </>
    );
  };

  return (
    <div className="flex h-full flex-col justify-center text-center">
      <p
        className="m-0 font-sans uppercase"
        style={{ fontSize: 14, letterSpacing: '0.28em', color: GOLD, minHeight: '1.25em' }}
      >
        {renderWithBreaks(visibleFor(0), showCursor(0))}
      </p>
      <h2
        className="m-0 mt-4 font-serif font-semibold leading-tight"
        style={{ fontSize: 44, color: INK, minHeight: '2.4em' }}
      >
        {blockIdx >= 1 ? renderWithBreaks(visibleFor(1), showCursor(1)) : null}
      </h2>
      {blockIdx >= 1 && charIdx >= WELCOME_BLOCKS[1].text.length ? (
        <span
          aria-hidden
          className="mx-auto mt-6 block h-px w-40"
          style={{ background: `linear-gradient(to right, transparent, ${GOLD}, transparent)` }}
        />
      ) : null}
      <p
        className="mx-auto mt-7 max-w-[400px] font-serif leading-relaxed"
        style={{ fontSize: 21, color: '#3d3428', minHeight: blockIdx >= 2 ? undefined : 0 }}
      >
        {blockIdx >= 2 ? renderWithBreaks(visibleFor(2), showCursor(2)) : null}
      </p>
      <p
        className="mx-auto mt-8 max-w-[380px] font-sans leading-relaxed"
        style={{ fontSize: 16, color: '#6b5c48', minHeight: blockIdx >= 3 ? undefined : 0 }}
      >
        {blockIdx >= 3 ? renderWithBreaks(visibleFor(3), showCursor(3)) : null}
      </p>
      {allDone ? (
        <span aria-hidden className="mx-auto mt-8 text-2xl" style={{ color: GOLD }}>
          ◆
        </span>
      ) : null}
    </div>
  );
}

type WallContentProps = {
  menu: MenuId;
  /** Opent de online agenda (boeken) op ditzelfde muurpaneel. */
  onBook: (calendarSlug: string, title: string) => void;
  /** Opent de contactpagina op ditzelfde muurpaneel. */
  onContact: () => void;
};

/** Inhoud per menu-item, gerenderd op het muurpaneel. */
function WallContent({ menu, onBook, onContact }: WallContentProps) {
  switch (menu) {
    case 'model-worden':
      return (
        <div>
          <WallHeading kicker="Class-Models" title="Model worden" />
          <div className="mt-5 space-y-6">
            {CARD_MODEL_WORDEN.map((card) => (
              <section key={card.title}>
                <p className="m-0 font-sans uppercase" style={{ fontSize: 10.5, letterSpacing: '0.2em', color: GOLD }}>
                  {card.kicker}
                </p>
                <h3 className="m-0 mt-1 font-serif font-semibold" style={{ fontSize: 18, color: INK }}>
                  {card.title}
                </h3>
                <WallBullets items={card.bullets} />
              </section>
            ))}
          </div>
          <h3 className="m-0 mt-7 font-serif font-semibold" style={{ fontSize: 18, color: INK }}>
            Waarom Class-Models
          </h3>
          <div className="mt-2 space-y-2.5">
            {WAAROM_PARAGRAPHS.map((p) => (
              <p key={p} className="m-0 font-sans leading-relaxed" style={{ fontSize: 13.5, color: '#4a4033' }}>
                {p}
              </p>
            ))}
          </div>
          <WallBullets items={WAAROM_CHECKLIST} />
          <WallStats />
          <WallCta
            onClick={() => onBook('gratis-fotoshoot', 'Plan je gratis fotoshoot')}
            label="Plan je gratis fotoshoot"
          />
        </div>
      );
    case 'gratis-fotoshoot':
      return (
        <div>
          <WallHeading kicker="Gratis testshoot" title="Gratis fotoshoot" />
          <h3 className="m-0 mt-5 font-serif font-semibold" style={{ fontSize: 18, color: INK }}>
            {GRATIS_FOTOSHOOT_PAGE.expectTitle}
          </h3>
          <WallBullets items={GRATIS_FOTOSHOOT_PAGE.expectBullets} />
          <h3 className="m-0 mt-6 font-serif font-semibold" style={{ fontSize: 18, color: INK }}>
            {GRATIS_FOTOSHOOT_PAGE.whyTitle}
          </h3>
          <p className="m-0 mt-2 font-sans leading-relaxed" style={{ fontSize: 14, color: '#3d3428' }}>
            {GRATIS_FOTOSHOOT_PAGE.whyParagraph}
          </p>
          <WallCta
            onClick={() => onBook('gratis-fotoshoot', GRATIS_FOTOSHOOT_PAGE.ctaButton)}
            label={GRATIS_FOTOSHOOT_PAGE.ctaButton}
          />
        </div>
      );
    case 'casting':
      return (
        <div>
          <WallHeading kicker="Directe kansen" title="Casting" />
          <h3 className="m-0 mt-5 font-serif font-semibold" style={{ fontSize: 18, color: INK }}>
            {CASTING_PAGE.expectTitle}
          </h3>
          <WallBullets items={CASTING_PAGE.expectBullets} />
          <h3 className="m-0 mt-6 font-serif font-semibold" style={{ fontSize: 18, color: INK }}>
            {CASTING_PAGE.whyTitle}
          </h3>
          <p className="m-0 mt-2 font-sans leading-relaxed" style={{ fontSize: 14, color: '#3d3428' }}>
            {CASTING_PAGE.whyParagraph}
          </p>
          <WallCta onClick={() => onBook('casting', CASTING_PAGE.ctaButton)} label={CASTING_PAGE.ctaButton} />
        </div>
      );
    case 'intake-gesprek':
      return (
        <div>
          <WallHeading kicker="Persoonlijk advies" title="Intake gesprek" />
          <h3 className="m-0 mt-5 font-serif font-semibold" style={{ fontSize: 18, color: INK }}>
            {INTAKE_GESPREK_PAGE.howTitle}
          </h3>
          <ol className="m-0 mt-4 list-none space-y-3 p-0">
            {INTAKE_GESPREK_PAGE.steps.map((s, i) => (
              <li key={s} className="flex gap-3 font-sans leading-snug" style={{ fontSize: 14, color: '#3d3428' }}>
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-serif"
                  style={{ border: `1px solid ${GOLD}`, color: GOLD, fontSize: 12.5 }}
                >
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <h3 className="m-0 mt-6 font-serif font-semibold" style={{ fontSize: 18, color: INK }}>
            {INTAKE_GESPREK_PAGE.whyTitle}
          </h3>
          <WallBullets items={WAAROM_CHECKLIST} />
          <WallCta
            onClick={() => onBook('intake-gesprek', INTAKE_GESPREK_PAGE.ctaButton)}
            label={INTAKE_GESPREK_PAGE.ctaButton}
          />
        </div>
      );
    case 'doelgroepen':
      return (
        <div>
          <WallHeading kicker="Voor iedereen" title="Doelgroepen" />
          <p className="m-0 mt-4 font-sans leading-relaxed" style={{ fontSize: 14, color: '#3d3428' }}>
            {DOELGROEPEN_INTRO}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {DOELGROEPEN_CARDS.map((c) => (
              <div key={c.title} className="rounded-md p-3" style={{ border: '1px solid rgba(138,107,69,0.35)' }}>
                <h3 className="m-0 font-serif font-semibold" style={{ fontSize: 15.5, color: INK }}>
                  {c.title}
                </h3>
                <p className="m-0 mt-1 font-sans leading-snug" style={{ fontSize: 12.5, color: '#4a4033' }}>
                  {c.body}
                </p>
              </div>
            ))}
          </div>
          <WallCta
            onClick={() => onBook('gratis-fotoshoot', 'Plan je gratis fotoshoot')}
            label="Plan je gratis fotoshoot"
          />
        </div>
      );
    case 'veelgestelde-vragen':
      return (
        <div>
          <WallHeading kicker="Goed om te weten" title="Veelgestelde vragen" />
          <div className="mt-5 space-y-4">
            {GUEST_FAQ.map((f) => (
              <section key={f.q}>
                <h3 className="m-0 font-serif font-semibold" style={{ fontSize: 15.5, color: INK }}>
                  {f.q}
                </h3>
                <p className="m-0 mt-1 font-sans leading-snug" style={{ fontSize: 13.5, color: '#4a4033' }}>
                  {f.a}
                </p>
              </section>
            ))}
          </div>
          <WallCta onClick={onContact} label="Stel je vraag via contact" />
        </div>
      );
    case 'testshoot':
      return (
        <div>
          <WallHeading kicker="Portfolio" title="Testshoot" />
          <p className="m-0 mt-4 font-sans leading-relaxed" style={{ fontSize: 14, color: '#3d3428' }}>
            Na je gratis fotoshoot vind je de foto&apos;s van je testshoot terug in het gastenportaal. Geef kort
            feedback en download daarna alle foto&apos;s in volle kwaliteit.
          </p>
          <p className="m-0 mt-3 font-sans leading-relaxed" style={{ fontSize: 14, color: '#3d3428' }}>
            Log in via het gastenportaal om jouw testshoot te bekijken.
          </p>
          <Link
            href="/portal/guest?p=testshoot"
            className="mt-5 block w-full rounded-md py-3 text-center font-sans font-semibold text-white transition hover:opacity-90"
            style={{ fontSize: 14.5, background: '#6f121b' }}
          >
            Bekijk jouw testshoot
          </Link>
          <WallPortalLink href="/portal/guest" label="Naar het gastenportaal" />
        </div>
      );
  }
}

/**
 * Beginpagina: film 1 (lift) → stilstaand eindbeeld met klikbare liftknoppen →
 * film 100 (lift naar receptie) → stilstaand eindbeeld met klikbaar menubord;
 * de gekozen inhoud verschijnt in perspectief op het witte paneel van de rechtermuur.
 */
export function BeginLiftExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shellRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLVideoElement>(null);
  const rideRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [scale, setScale] = useState(1);
  const [activeMenu, setActiveMenu] = useState<MenuId | null>(null);
  /** Extra weergave bovenop het gekozen menu-item: agenda (boeken) of contact — op de muur zelf. */
  const [wallOverlay, setWallOverlay] = useState<
    | { kind: 'booking'; slug: string; title: string }
    | { kind: 'contact' }
    | null
  >(null);

  const openMenu = useCallback((id: MenuId) => {
    setActiveMenu(id);
    setWallOverlay(null);
  }, []);

  /**
   * 80% van de breedte, maar nooit hoger dan de ruimte onder de zwarte menubalk:
   * de film begint direct onder de balk en wordt onderaan niet afgekapt.
   * De shell krijgt exact de geschaalde filmhoogte.
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

  /** Autoplay kan geblokkeerd zijn; dan tonen we meteen het eindbeeld met de knoppen. */
  useEffect(() => {
    const v = introRef.current;
    if (!v) return;
    const p = v.play();
    if (p) {
      p.catch(() => {
        if (v.duration && Number.isFinite(v.duration)) v.currentTime = v.duration;
        setPhase('lift');
      });
    }
  }, []);

  const startRide = useCallback(() => {
    introRef.current?.pause();
    setPhase('ride');
    const v = rideRef.current;
    if (v) {
      v.currentTime = 0;
      void v.play().catch(() => setPhase('desk'));
    }
  }, []);

  /** `/?go=guest` (Gastenportaal in de menubalk) → meteen film 100: de lift gaat open. */
  const goParam = searchParams.get('go');
  useEffect(() => {
    if (goParam === 'guest') startRide();
  }, [goParam, startRide]);

  const onLiftButton = useCallback(
    (action: 'model' | 'client' | 'guest') => {
      if (action === 'model') {
        router.push('/lobby?tab=model');
        return;
      }
      if (action === 'client') {
        router.push('/lobby?tab=client');
        return;
      }
      startRide();
    },
    [router, startRide],
  );

  const wallTransform = quadMatrix3d(WALL_SRC_W, WALL_SRC_H, WALL_QUAD);

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
        {/* Film 1 — lift; blijft op het laatste beeld staan (geen controls). */}
        <video
          ref={introRef}
          src={VIDEO_INTRO}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          onEnded={() => setPhase('lift')}
          onContextMenu={(e) => e.preventDefault()}
          className={`absolute inset-0 h-full w-full select-none object-fill ${
            phase === 'intro' || phase === 'lift' ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Film 100 — lift naar receptie; blijft op het laatste beeld staan. */}
        <video
          ref={rideRef}
          src={VIDEO_DESK}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          onEnded={() => setPhase('desk')}
          onContextMenu={(e) => e.preventDefault()}
          className={`absolute inset-0 h-full w-full select-none object-fill ${
            phase === 'ride' || phase === 'desk' ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Liftknoppen — pas klikbaar op het eindbeeld van film 1. */}
        {phase === 'lift'
          ? LIFT_BUTTONS.map((b) => (
              <button
                key={b.label}
                type="button"
                aria-label={b.label}
                title={b.label}
                onClick={() => onLiftButton(b.action)}
                className="absolute cursor-pointer rounded-full bg-transparent outline-none transition duration-300 hover:shadow-[0_0_34px_10px_rgba(255,214,150,0.28)] focus-visible:shadow-[0_0_34px_10px_rgba(255,214,150,0.28)]"
                style={{ left: b.x, top: b.y, width: b.w, height: b.h }}
              />
            ))
          : null}

        {/* Tv in de receptie — zwart kader met stand-by lampje, promofilm in loop. */}
        {phase === 'desk' ? (
          <div className="pointer-events-none absolute inset-0 z-10">
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: TV_SRC_W,
                height: TV_SRC_H,
                transform: quadMatrix3d(TV_SRC_W, TV_SRC_H, TV_QUAD),
                transformOrigin: '0 0',
                background: '#0a0a0c',
                borderRadius: 5,
                boxShadow: 'inset 0 0 6px rgba(255,255,255,0.06)',
              }}
            >
              <video
                src={VIDEO_TV}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
                className="select-none object-fill"
                style={{
                  position: 'absolute',
                  left: TV_BEZEL_X,
                  right: TV_BEZEL_X,
                  top: TV_BEZEL_TOP,
                  bottom: TV_BEZEL_BOTTOM,
                  width: TV_SRC_W - 2 * TV_BEZEL_X,
                  height: TV_SRC_H - TV_BEZEL_TOP - TV_BEZEL_BOTTOM,
                  borderRadius: 2,
                }}
              />
              {/* Stand-by lampje onderaan in het midden van de bezel. */}
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: 5,
                  width: 4,
                  height: 4,
                  marginLeft: -2,
                  borderRadius: '50%',
                  background: '#7fffb0',
                  boxShadow: '0 0 6px 2px rgba(127,255,176,0.75)',
                }}
              />
            </div>
          </div>
        ) : null}

        {/* Menubord op de desk — pas klikbaar op het eindbeeld van film 100. */}
        {phase === 'desk'
          ? DESK_MENU.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-label={m.label}
                onClick={() => openMenu(m.id)}
                className={`absolute cursor-pointer rounded-sm bg-transparent outline-none transition duration-300 ${
                  activeMenu === m.id
                    ? 'shadow-[0_0_22px_6px_rgba(255,214,150,0.30)]'
                    : 'hover:shadow-[0_0_22px_6px_rgba(255,214,150,0.20)]'
                }`}
                style={{ left: m.x, top: m.y, width: m.w, height: m.h }}
              />
            ))
          : null}

        {/* Inhoud op de rechtermuur — zelfde hoeken als de muur (homografie). */}
        {phase === 'desk' ? (
          <div className="pointer-events-none absolute inset-0 z-10">
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: WALL_SRC_W,
                height: WALL_SRC_H,
                transform: wallTransform,
                transformOrigin: '0 0',
              }}
            >
              <div
                key={wallOverlay ? wallOverlay.kind : (activeMenu ?? 'welkom')}
                className="pointer-events-auto h-full w-full overflow-y-auto overflow-x-hidden px-7 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{ animation: 'beginWallFade 480ms ease-out' }}
              >
                {wallOverlay ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setWallOverlay(null)}
                      className="mb-4 cursor-pointer rounded-full px-3.5 py-1.5 font-sans transition hover:opacity-80"
                      style={{ fontSize: 13, color: GOLD, border: `1px solid ${GOLD}55`, background: 'transparent' }}
                    >
                      ← Terug naar het overzicht
                    </button>
                    {wallOverlay.kind === 'booking' ? (
                      <GuestBookingPanel
                        calendarSlug={wallOverlay.slug}
                        heading={wallOverlay.title}
                        variant="default"
                        onClose={() => setWallOverlay(null)}
                      />
                    ) : (
                      <GuestContactSection />
                    )}
                  </div>
                ) : activeMenu ? (
                  <WallContent
                    menu={activeMenu}
                    onBook={(slug, title) => setWallOverlay({ kind: 'booking', slug, title })}
                    onContact={() => setWallOverlay({ kind: 'contact' })}
                  />
                ) : (
                  <WallWelcome />
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <style>{`
        @keyframes beginWallFade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
