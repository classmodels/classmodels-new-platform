'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GRATIS_FOTOSHOOT_PAGE } from '@/components/guest-portal/guest-portal-data';
import { GuestBookingPanel } from '@/components/guest-portal/GuestBookingPanel';

const SHEET_BASE = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';
const VIDEO = `${SHEET_BASE}/videos/fotoshoot-loop.mp4`;
const PLAQUE_IMG = `${SHEET_BASE}/images/gratis-fotoshoot-plaque.png`;

/** De film is 1920x1080; de kader-coördinaten zijn in dit stelsel gemeten. */
const BASE_W = 1920;
const BASE_H = 1080;
/** Zelfde breedte als de andere nieuwe pagina's. */
const WIDTH_FRACTION = 0.8;

/**
 * Binnenvlak van de grote houten kader op de rechtermuur, opgemeten op de film
 * (donkere lijst: x 1016–1044 / 1605–1643, y 184–217 / 621–657). Iets naar
 * binnen zodat de lijst volledig zichtbaar blijft.
 */
const FRAME = { left: 1054, top: 226, width: 542, height: 387 };

/**
 * Plakkaat "Gratis fotoshoot" — gecentreerd op de muurstrook boven de studio
 * (gelijke marge boven en onder), 50% breder dan de vorige maat.
 */
const STUDIO_CENTER_X = 592;
const WALL_STRIP_TOP = 163;
const WALL_STRIP_BOTTOM = 252;
const PLAQUE_W = 340;
/** Horizontaal uitgerekt, lager in hoogte — iets onder het plafond. */
const PLAQUE_H = 58;
const PLAQUE_SHIFT_DOWN = 6;
const PLAQUE = {
  left: STUDIO_CENTER_X - PLAQUE_W / 2,
  top:
    WALL_STRIP_TOP +
    (WALL_STRIP_BOTTOM - WALL_STRIP_TOP - PLAQUE_H) / 2 +
    PLAQUE_SHIFT_DOWN,
  width: PLAQUE_W,
  height: PLAQUE_H,
};

/** 2x supersampling: groot renderen en terugschalen → gestoken scherpe tekst. */
const SS = 2;

/** Alles zwart op de wand; alleen hoofdtitels vet. */
const INK = '#000000';
const RELIEF = '0 1px 1px rgba(255,240,214,0.35)';

/** Knopstijl zoals het kioskmenu: vlak donker met een licht lijntje boven/links. */
const BTN_STYLE = {
  background: '#131314',
  borderTop: '1px solid rgba(255,255,255,0.16)',
  borderLeft: '1px solid rgba(255,255,255,0.10)',
  borderRight: '1px solid rgba(255,255,255,0.03)',
  borderBottom: '1px solid rgba(0,0,0,0)',
  boxShadow: 'inset 0 -10px 14px rgba(0,0,0,0.30)',
} as const;

/**
 * Gratis fotoshoot: film 60 in loop met de pagina-inhoud rechtstreeks op de
 * wand in de grote kader (volledig transparante achtergrond). De film loopt
 * gewoon door; de content staat er los overheen en verspringt dus nooit.
 */
export function GratisFotoshootFilm() {
  const shellRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [booking, setBooking] = useState(false);

  /** Eigen, altijd zichtbare gouden scrollrail — zoals op de andere nieuwe pagina's. */
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState({ frac: 0, ratio: 1 });

  const syncScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    setScrollPos({
      frac: maxScroll > 0 ? el.scrollTop / maxScroll : 0,
      ratio: el.scrollHeight > 0 ? Math.min(1, el.clientHeight / el.scrollHeight) : 1,
    });
  }, []);

  useEffect(() => {
    syncScroll();
  }, [booking, syncScroll]);

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
        {/* Fotostudio-film — blijft altijd in loop doorspelen. */}
        <video
          src={VIDEO}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          className="absolute inset-0 h-full w-full select-none object-fill"
        />

        {/* Plakkaat boven de fotostudio — gecentreerd op de muur */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PLAQUE_IMG}
          alt="Gratis fotoshoot"
          draggable={false}
          className="pointer-events-none absolute select-none object-fill"
          style={{
            left: PLAQUE.left,
            top: PLAQUE.top,
            width: PLAQUE.width,
            height: PLAQUE.height,
          }}
        />

        {/* Inhoud rechtstreeks op de wand in de grote kader — geen achtergrond. */}
        <div
          className="absolute"
          style={{
            left: FRAME.left,
            top: FRAME.top,
            width: FRAME.width,
            height: FRAME.height,
          }}
        >
          <div
            className="relative origin-top-left"
            style={{
              width: FRAME.width * SS,
              height: FRAME.height * SS,
              transform: `scale(${1 / SS})`,
            }}
          >
            <div
              ref={scrollRef}
              onScroll={syncScroll}
              key={booking ? 'booking' : 'content'}
              className="h-full w-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{
                padding: '10px 64px 24px 8px',
                animation: 'fotoshootFade 480ms ease-out',
              }}
            >
              {booking ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setBooking(false)}
                    className="mb-6 cursor-pointer rounded-full px-6 py-2.5 font-sans transition hover:opacity-80"
                    style={{
                      fontSize: 32,
                      color: INK,
                      border: `2px solid ${INK}88`,
                      background: 'transparent',
                    }}
                  >
                    ← Terug
                  </button>
                  <div className="cm-fotoshoot-booking">
                    <GuestBookingPanel
                      calendarSlug={GRATIS_FOTOSHOOT_PAGE.agendaSlug}
                      heading={GRATIS_FOTOSHOOT_PAGE.bookingSubject}
                      variant="default"
                      onClose={() => setBooking(false)}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <h2
                    className="m-0 font-serif font-bold"
                    style={{
                      fontSize: 96,
                      lineHeight: 1.04,
                      color: INK,
                      textShadow: RELIEF,
                    }}
                  >
                    Gratis fotoshoot
                  </h2>
                  <span
                    aria-hidden
                    className="mt-6 block w-44"
                    style={{
                      height: 3,
                      background: `linear-gradient(to right, ${INK}, transparent)`,
                    }}
                  />

                  <h3
                    className="m-0 mt-9 font-serif font-bold"
                    style={{ fontSize: 52, color: INK, textShadow: RELIEF }}
                  >
                    {GRATIS_FOTOSHOOT_PAGE.expectTitle}
                  </h3>
                  <ul className="m-0 mt-5 list-none space-y-4 p-0">
                    {GRATIS_FOTOSHOOT_PAGE.expectBullets.map((b) => (
                      <li key={b} className="flex items-start gap-4">
                        <span
                          aria-hidden
                          className="mt-[17px] block h-[10px] w-[10px] shrink-0 rotate-45"
                          style={{ background: INK }}
                        />
                        <span
                          className="font-sans leading-relaxed"
                          style={{ fontSize: 38, color: INK, textShadow: RELIEF }}
                        >
                          {b}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <h3
                    className="m-0 mt-10 font-serif font-bold"
                    style={{ fontSize: 52, color: INK, textShadow: RELIEF }}
                  >
                    {GRATIS_FOTOSHOOT_PAGE.whyTitle}
                  </h3>
                  <p
                    className="m-0 mt-4 font-sans leading-relaxed"
                    style={{ fontSize: 38, color: INK, textShadow: RELIEF }}
                  >
                    {GRATIS_FOTOSHOOT_PAGE.whyParagraph}
                  </p>

                  {/* Boekingsknop — rechts uitgelijnd */}
                  <div className="mt-10 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setBooking(true)}
                      className="cursor-pointer rounded-xl px-10 text-center outline-none transition-colors duration-150"
                      style={{
                        minHeight: 84,
                        ...BTN_STYLE,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#1b1b1d';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#131314';
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                          fontSize: 30,
                          letterSpacing: '0.035em',
                          color: 'rgba(255,255,255,0.97)',
                        }}
                      >
                        {GRATIS_FOTOSHOOT_PAGE.ctaButton}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Altijd zichtbare gouden scrollrail rechts in de kader */}
            {scrollPos.ratio < 1 ? (
              <div
                aria-hidden
                className="pointer-events-none absolute flex flex-col items-center"
                style={{ right: 6, top: 10, bottom: 10, width: 40 }}
              >
                <span
                  className="mb-1 shrink-0 select-none font-sans"
                  style={{ fontSize: 24, lineHeight: 1, color: 'rgba(120,72,30,0.9)' }}
                >
                  ▲
                </span>
                <span
                  className="relative block min-h-0 w-[18px] flex-1 rounded-full"
                  style={{
                    background: 'rgba(46,28,14,0.4)',
                    border: '1px solid rgba(120,72,30,0.45)',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.35)',
                  }}
                >
                  <span
                    className="absolute left-[2px] right-[2px] block rounded-full"
                    style={{
                      height: `${Math.max(10, scrollPos.ratio * 100)}%`,
                      top: `${scrollPos.frac * (100 - Math.max(10, scrollPos.ratio * 100))}%`,
                      background:
                        'linear-gradient(180deg, rgba(240,204,140,0.95), rgba(196,150,90,0.95))',
                      boxShadow: '0 0 10px rgba(240,204,140,0.55)',
                    }}
                  />
                </span>
                <span
                  className="mt-1 shrink-0 select-none font-sans"
                  style={{ fontSize: 24, lineHeight: 1, color: 'rgba(120,72,30,0.9)' }}
                >
                  ▼
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fotoshootFade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Agendapaneel op de wand: alles zwart en groter leesbaar. */
        .cm-fotoshoot-booking [class*="bg-white"],
        .cm-fotoshoot-booking [class*="bg-panel"] {
          background: transparent !important;
        }
        .cm-fotoshoot-booking [class*="border-zinc"],
        .cm-fotoshoot-booking [class*="border-line"] {
          border-color: rgba(0, 0, 0, 0.35) !important;
        }
        .cm-fotoshoot-booking [class*="bg-burgundy"] {
          background: #131314 !important;
          border: 1px solid rgba(0, 0, 0, 0.5) !important;
          color: #ffffff !important;
        }
        .cm-fotoshoot-booking [class*="text-burgundy"] {
          color: #000000 !important;
        }
        .cm-fotoshoot-booking [class*="border-burgundy"] {
          border-color: rgba(0, 0, 0, 0.45) !important;
        }
        .cm-fotoshoot-booking,
        .cm-fotoshoot-booking [class*="text-ink"],
        .cm-fotoshoot-booking p,
        .cm-fotoshoot-booking label,
        .cm-fotoshoot-booking span,
        .cm-fotoshoot-booking li,
        .cm-fotoshoot-booking td,
        .cm-fotoshoot-booking th {
          color: #000000 !important;
          font-size: 34px !important;
          line-height: 1.45 !important;
        }
        .cm-fotoshoot-booking h1,
        .cm-fotoshoot-booking h2,
        .cm-fotoshoot-booking h3 {
          color: #000000 !important;
          font-size: 44px !important;
          font-weight: 700 !important;
          line-height: 1.2 !important;
        }
        .cm-fotoshoot-booking input,
        .cm-fotoshoot-booking select,
        .cm-fotoshoot-booking textarea {
          background: rgba(255, 252, 246, 0.92) !important;
          border-color: rgba(0, 0, 0, 0.35) !important;
          color: #000000 !important;
          font-size: 30px !important;
        }
        .cm-fotoshoot-booking [class*="shadow"] {
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
}
