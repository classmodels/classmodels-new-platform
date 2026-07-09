'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GRATIS_FOTOSHOOT_PAGE } from '@/components/guest-portal/guest-portal-data';
import { GuestBookingPanel } from '@/components/guest-portal/GuestBookingPanel';

const SHEET_BASE = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';
const BG = `${SHEET_BASE}/images/gratis-fotoshoot-bg.png`;

/** Achtergrond 6.png — zelfde basis als showroom (1672×941). */
const BASE_W = 1672;
const BASE_H = 941;
/** Zelfde breedte als de andere nieuwe pagina's. */
const WIDTH_FRACTION = 0.8;

/**
 * Inhoudszone binnen de grote kader op 6.png.
 * Duidelijk naar links getrokken en hoger/lager uitgespannen, maar nog steeds
 * ruim binnen de lijst zodat tekst nooit buiten de kader of over de borden valt.
 */
const FRAME = { left: 872, top: 206, width: 452, height: 430 };
const INFO_BTN = { left: 1306, top: 125, width: 132, height: 54 };
const BOOK_BTN = { left: 1288, top: 214, width: 166, height: 60 };
const EXIT_BTN = { left: 1288, top: 394, width: 166, height: 64 };

/** 2x supersampling: groot renderen en terugschalen → gestoken scherpe tekst. */
const SS = 2;

/** Alles zwart op de wand; hoofdtitels en tussenkoppen vet. */
const INK = '#000000';
const RELIEF = '0 1px 1px rgba(255,240,214,0.35)';

/**
 * Gratis fotoshoot: statische achtergrond 6.png met info en online agenda
 * als doorzichtige overlay in de grote kader (info boven, afspraak + kalender eronder).
 */
export function GratisFotoshootFilm() {
  const router = useRouter();
  const shellRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [panel, setPanel] = useState<'info' | 'booking'>('info');

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
  }, [syncScroll]);

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BG}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full select-none object-fill"
        />

        {/* Transparante klikzones boven de drie borden rechts. */}
        <div className="absolute inset-0 z-10" style={{ pointerEvents: 'none' }}>
          {[
            { ...INFO_BTN, label: 'Info', onClick: () => setPanel('info') },
            { ...BOOK_BTN, label: 'Afspraak boeken', onClick: () => setPanel('booking') },
            { ...EXIT_BTN, label: 'Exit room', onClick: () => router.push('/') },
          ].map((btn) => (
            <button
              key={btn.label}
              type="button"
              aria-label={btn.label}
              title={btn.label}
              onClick={btn.onClick}
              className="absolute cursor-pointer rounded-md bg-transparent outline-none"
              style={{
                pointerEvents: 'auto',
                left: btn.left,
                top: btn.top,
                width: btn.width,
                height: btn.height,
              }}
            />
          ))}
        </div>

        {/* Inhoud in de grote kader — INFO of AFSPRAAK BOEKEN, volledig doorzichtig. */}
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
              className="h-full w-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ padding: '14px 38px 24px 16px' }}
            >
              <div className="w-full">
              {panel === 'info' ? (
                <>
              <h2
                className="m-0 w-full font-serif font-bold"
                style={{
                  fontSize: 68,
                  lineHeight: 1.05,
                  color: INK,
                  textShadow: RELIEF,
                }}
              >
                Gratis fotoshoot
              </h2>
              <span
                aria-hidden
                className="mt-4 block w-full max-w-[220px]"
                style={{
                  height: 3,
                  background: `linear-gradient(to right, ${INK}, transparent)`,
                }}
              />

              <h3
                className="m-0 mt-7 font-serif font-bold"
                style={{ fontSize: 42, color: INK, textShadow: RELIEF }}
              >
                {GRATIS_FOTOSHOOT_PAGE.expectTitle}
              </h3>
              <ul className="m-0 mt-4 list-none space-y-3 p-0">
                {GRATIS_FOTOSHOOT_PAGE.expectBullets.map((b) => (
                  <li key={b} className="flex items-start gap-4">
                    <span
                      aria-hidden
                      className="mt-[16px] block h-[9px] w-[9px] shrink-0 rotate-45"
                      style={{ background: INK }}
                    />
                        <span
                      className="min-w-0 flex-1 font-sans leading-relaxed"
                      style={{ fontSize: 30, color: INK, textShadow: RELIEF }}
                        >
                      {b}
                    </span>
                  </li>
                ))}
              </ul>

              <h3
                className="m-0 mt-8 font-serif font-bold"
                style={{ fontSize: 42, color: INK, textShadow: RELIEF }}
              >
                {GRATIS_FOTOSHOOT_PAGE.whyTitle}
              </h3>
              <p
                className="m-0 mt-3 font-sans leading-relaxed"
                style={{ fontSize: 30, color: INK, textShadow: RELIEF }}
              >
                {GRATIS_FOTOSHOOT_PAGE.whyParagraph}
              </p>
                </>
              ) : (
              <div className="cm-fotoshoot-booking">
                <h3
                  className="m-0 font-serif font-bold"
                  style={{ fontSize: 48, color: INK, textShadow: RELIEF }}
                >
                  Afspraak boeken
                </h3>
                <GuestBookingPanel
                  calendarSlug={GRATIS_FOTOSHOOT_PAGE.agendaSlug}
                  heading={GRATIS_FOTOSHOOT_PAGE.bookingSubject}
                  variant="default"
                  onClose={() => {}}
                />
              </div>
              )}
              </div>
            </div>

            {scrollPos.ratio < 1 ? (
              <div
                aria-hidden
                className="pointer-events-none absolute flex flex-col items-center"
                style={{ right: 4, top: 6, bottom: 6, width: 32 }}
              >
                <span
                  className="mb-1 shrink-0 select-none font-sans"
                  style={{ fontSize: 18, lineHeight: 1, color: 'rgba(120,72,30,0.9)' }}
                >
                  ▲
                </span>
                <span
                  className="relative block min-h-0 w-[14px] flex-1 rounded-full"
                  style={{
                    background: 'rgba(46,28,14,0.4)',
                    border: '1px solid rgba(120,72,30,0.45)',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.35)',
                  }}
                >
                  <span
                    className="absolute left-[1px] right-[1px] block rounded-full"
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
                  style={{ fontSize: 18, lineHeight: 1, color: 'rgba(120,72,30,0.9)' }}
                >
                  ▼
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <style>{`
        /* Agendapaneel op de wand: alles zwart, groter, volledig doorzichtig. */
        .cm-fotoshoot-booking [class*="bg-white"],
        .cm-fotoshoot-booking [class*="bg-panel"],
        .cm-fotoshoot-booking [class*="bg-zinc"] {
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
        .cm-fotoshoot-booking th,
        .cm-fotoshoot-booking button {
          color: #000000 !important;
          font-size: 32px !important;
          line-height: 1.4 !important;
        }
        .cm-fotoshoot-booking h1,
        .cm-fotoshoot-booking h2,
        .cm-fotoshoot-booking h3 {
          color: #000000 !important;
          font-size: 40px !important;
          font-weight: 700 !important;
          line-height: 1.2 !important;
        }
        .cm-fotoshoot-booking input,
        .cm-fotoshoot-booking select,
        .cm-fotoshoot-booking textarea {
          background: rgba(255, 252, 246, 0.92) !important;
          border-color: rgba(0, 0, 0, 0.35) !important;
          color: #000000 !important;
          font-size: 28px !important;
        }
        .cm-fotoshoot-booking [class*="shadow"] {
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
}
