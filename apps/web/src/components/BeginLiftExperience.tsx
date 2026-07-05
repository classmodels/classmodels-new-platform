'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
} from '@/components/guest-portal/guest-portal-data';

const SHEET_BASE = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';
const VIDEO_INTRO = `${SHEET_BASE}/videos/intro-lift.mp4`;
const VIDEO_DESK = `${SHEET_BASE}/videos/lift-to-desk.mp4`;

/** Beide films zijn 1280x720; alle hotspot/muur-coördinaten zijn in dit stelsel gemeten. */
const BASE_W = 1280;
const BASE_H = 720;

type Phase = 'intro' | 'lift' | 'ride' | 'desk';

type MenuId =
  | 'model-worden'
  | 'gratis-fotoshoot'
  | 'casting'
  | 'intake-gesprek'
  | 'doelgroepen'
  | 'veelgestelde-vragen'
  | 'testshoot';

/** Liftknoppen (eindbeeld film 1) — drie ronde knoppen links in de lift. */
const LIFT_BUTTONS: { label: string; x: number; y: number; w: number; h: number }[] = [
  { label: 'Modellen portaal', x: 50, y: 128, w: 100, h: 118 },
  { label: 'Klanten portaal', x: 50, y: 262, w: 100, h: 118 },
  { label: 'Gasten portaal', x: 50, y: 408, w: 100, h: 118 },
];

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

/** Inhoud per menu-item, gerenderd op het muurpaneel. */
function WallContent({ menu }: { menu: MenuId }) {
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
  const shellRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLVideoElement>(null);
  const rideRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [scale, setScale] = useState(1);
  const [activeMenu, setActiveMenu] = useState<MenuId | null>(null);

  /** Volledige breedte van de site; verticaal gecentreerd (hoge schermen: donkere rand boven/onder). */
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth > 0 ? el.clientWidth / BASE_W : 1);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
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

  const onLiftButton = useCallback(() => {
    setPhase('ride');
    const v = rideRef.current;
    if (v) {
      v.currentTime = 0;
      void v.play().catch(() => setPhase('desk'));
    }
  }, []);

  const wallTransform = quadMatrix3d(WALL_SRC_W, WALL_SRC_H, WALL_QUAD);

  return (
    <div ref={shellRef} className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: BASE_W,
          height: BASE_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
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
                onClick={onLiftButton}
                className="absolute cursor-pointer rounded-full bg-transparent outline-none transition duration-300 hover:shadow-[0_0_34px_10px_rgba(255,214,150,0.28)] focus-visible:shadow-[0_0_34px_10px_rgba(255,214,150,0.28)]"
                style={{ left: b.x, top: b.y, width: b.w, height: b.h }}
              />
            ))
          : null}

        {/* Menubord op de desk — pas klikbaar op het eindbeeld van film 100. */}
        {phase === 'desk'
          ? DESK_MENU.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-label={m.label}
                onClick={() => setActiveMenu(m.id)}
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
        {phase === 'desk' && activeMenu ? (
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
                key={activeMenu}
                className="pointer-events-auto h-full w-full overflow-y-auto overflow-x-hidden px-7 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{ animation: 'beginWallFade 480ms ease-out' }}
              >
                <WallContent menu={activeMenu} />
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
