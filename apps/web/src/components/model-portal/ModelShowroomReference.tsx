'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { CmProgressBar } from '@/components/CmProgressBar';
import { QuadPhotoPin } from '@/components/model-portal/model-gallery-3d/QuadPhotoPin';
import { QuadWallText } from '@/components/model-portal/model-gallery-3d/QuadWallText';
import { useDemoPhotoUrls } from '@/components/model-portal/model-gallery-3d/demoPhotoDataUrl';
import {
  SHOWCASE_MODEL,
  SHOWCASE_PHOTO_URLS,
} from '@/components/model-portal/model-gallery-3d/showcaseDemoData';
import type { Quad } from '@/components/model-portal/model-gallery-3d/quadTransform';
import { quadSourceSize } from '@/components/model-portal/model-gallery-3d/quadTransform';
import {
  showroomDisplayName,
  showroomStats,
} from '@/components/model-portal/model-gallery-3d/showroomTextData';
import { useShowroomGallery } from '@/components/model-portal/model-gallery-3d/useShowroomGallery';
import layout from '@/components/model-portal/showroom-room-layout.json';

const SHEET_BASE = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';
const BG = `${SHEET_BASE}/images/showroom-room-bg-v3.png`;

const BASE_W = layout.base.width;
const BASE_H = layout.base.height;
/** Linkermuur — grote hoofdfoto met backlight (zoals referentiebeeld). */
const HERO_QUAD = layout.hero as Quad;
/** Achtermuur — 10 kleine foto's (2 rijen van 5) met muurperspectief. */
const GRID_QUADS = layout.grid as Quad[];
/** Achtermuur rechts — maten van het model onder de naam. */
const STATS_QUAD = layout.statsWall as Quad;
/** Achtermuur rechts — naam van het model bovenaan. */
const NAME_QUAD = layout.nameWall as Quad;
/** Achtermuur — "Modellengallerij" onder de foto's. */
const LABEL_QUAD = layout.galleryLabel as Quad;

/** Max. crop links (hero begint op ±70px) en rechts (naam/maten tot ±1445px). */
const CROP_L_MAX = 60;
const CROP_R_MAX = 180;
/** Breedte die altijd zichtbaar moet blijven; smaller schalen we niet (dan liever randen boven/onder). */
const SAFE_MIN_W = BASE_W - CROP_L_MAX - CROP_R_MAX;

const HERO_SRC = quadSourceSize(HERO_QUAD);
const STATS_SRC = quadSourceSize(STATS_QUAD);
const NAME_SRC = quadSourceSize(NAME_QUAD);
const LABEL_SRC = quadSourceSize(LABEL_QUAD);

/** Canvasdikte (px in bronrechthoek) — foto's hangen als dikke doeken. */
const CANVAS_DEPTH_SMALL = 5;
const CANVAS_DEPTH_HERO = 9;
const CANVAS_EDGE = '#241a16';

/** Naam rechtsboven op de muur — warme serif met zachte backlight-gloed (ref. beeld 2). */
function GlowWallName({ text, fontSize }: { text: string; fontSize: number }) {
  const typo = {
    fontSize,
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap' as const,
  };
  return (
    <div className="relative flex h-full w-full items-center justify-end font-serif font-medium leading-none">
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 select-none"
        style={{ ...typo, color: 'rgba(255,214,150,0.6)', filter: 'blur(10px)' }}
      >
        {text}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 select-none"
        style={{ ...typo, color: 'rgba(120,78,40,0.35)', transform: 'translateY(2px)' }}
      >
        {text}
      </span>
      <span
        className="relative"
        style={{
          ...typo,
          color: '#fff7e8',
          textShadow: [
            `0 0 ${fontSize * 0.3}px rgba(255,226,178,0.9)`,
            `0 0 ${fontSize * 0.8}px rgba(240,195,140,0.55)`,
            '0 1px 2px rgba(70,40,15,0.35)',
          ].join(', '),
        }}
      >
        {text}
      </span>
    </div>
  );
}

/** Geschilderd muurlabel met backlight-gloed (Modellen Gallerij). */
function PaintedWallLabel({ text, fontSize }: { text: string; fontSize: number }) {
  const typo = {
    fontSize,
    letterSpacing: '0.14em',
    whiteSpace: 'nowrap' as const,
  };
  return (
    <div className="relative flex h-full w-full items-center font-serif font-semibold leading-none">
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 select-none"
        style={{ ...typo, color: 'rgba(255,198,128,0.55)', filter: 'blur(9px)' }}
      >
        {text}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 select-none"
        style={{ ...typo, color: 'rgba(255,218,158,0.9)', filter: 'blur(3px)' }}
      >
        {text}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 select-none"
        style={{ ...typo, color: 'rgba(54,36,22,0.35)', transform: 'translateY(2px)' }}
      >
        {text}
      </span>
      <span
        className="relative"
        style={{
          ...typo,
          color: 'rgba(196,156,104,0.95)',
          WebkitTextStroke: '1px rgba(106,72,42,0.35)',
          textShadow: '0 -1px 0 rgba(255,245,220,0.5), 0 1px 2px rgba(0,0,0,0.25)',
        }}
      >
        {text}
      </span>
    </div>
  );
}

/** Lettergrootte zodat de tekst binnen de bronbreedte past. */
function fitFontSize(text: string, srcW: number, max: number): number {
  if (!text) return max;
  const perChar = 0.74 + 0.1; // glyf + tracking (em)
  return Math.min(max, (srcW * 0.97) / (text.length * perChar));
}

/** "SOPHIE V." → "Sophie V." (initialen met punt blijven hoofdletters). */
function toTitleCase(name: string): string {
  return name
    .split(/\s+/)
    .map((w) =>
      /^[A-Z]\.?$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    )
    .join(' ');
}

/** "176 CM" → "176 cm", "DONKERBRUIN" → "Donkerbruin". */
function statValueCase(v: string): string {
  if (/cm$/i.test(v.trim())) return v.toLowerCase();
  if (/^[\d.,/ ]+$/.test(v.trim())) return v;
  const low = v.toLowerCase();
  return low.charAt(0).toUpperCase() + low.slice(1);
}

export function ModelShowroomReference({
  modelId,
  demo = false,
}: {
  modelId?: string | null;
  demo?: boolean;
}) {
  const { token, user } = useAuth();
  const isAdmin = Boolean(user?.roles?.includes('admin'));
  const gallery = useShowroomGallery(token, demo ? null : modelId ?? null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [coverScale, setCoverScale] = useState(1);
  const [coverShiftX, setCoverShiftX] = useState(0);
  /** Vastgeklikte foto — blijft staan na klik. */
  const [pinnedIndex, setPinnedIndex] = useState(0);
  /** Tijdelijke hover-preview — valt terug op pinned bij mouse-leave. */
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const slideIndex = hoverIndex ?? pinnedIndex;

  const demoUrls = useDemoPhotoUrls();
  const isShowcase =
    demo || (!modelId && !gallery.loading && !gallery.photoUrls.length);
  const photoUrls = isShowcase
    ? SHOWCASE_PHOTO_URLS
    : gallery.photoUrls.length
      ? gallery.photoUrls
      : demoUrls;
  const activeModel = isShowcase ? SHOWCASE_MODEL : gallery.model;
  const loading = isShowcase ? false : gallery.loading;
  const error = isShowcase ? null : gallery.error;

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const update = () => {
      // Schermvullend (cover), maar de zijwaartse crop is begrensd zodat de
      // foto's en teksten nooit buiten beeld vallen; op smallere schermen
      // ontstaat dan een subtiele donkere rand boven/onder.
      const cover = Math.max(el.clientWidth / BASE_W, el.clientHeight / BASE_H);
      const s = Math.min(cover, el.clientWidth / SAFE_MIN_W);
      setCoverScale(s > 0 ? s : 1);
      // Verdeel de crop: links zit de naam/foto's dicht bij de rand, rechts
      // is na de hero vooral lege muur — dus rechts mag meer wegvallen.
      const crop = Math.max(0, BASE_W * s - el.clientWidth);
      const cropL = crop * (CROP_L_MAX / (CROP_L_MAX + CROP_R_MAX));
      setCoverShiftX(crop / 2 - cropL);
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

  const heroSrc = photoUrls[slideIndex] ?? photoUrls[0] ?? '';

  /** Naam in gemengde kast ("Sophie V.") zoals het referentiebeeld. */
  const nameLine = activeModel
    ? toTitleCase(showroomDisplayName(activeModel, isAdmin))
    : '';
  const stats = activeModel ? showroomStats(activeModel) : [];
  /** Alle beschikbaarheden op één regel. */
  const availInline = activeModel?.beschikbaar?.length
    ? activeModel.beschikbaar
        .map((b) => b.trim())
        .filter(Boolean)
        .join('  ·  ')
    : '';

  const onPinWall = useCallback((idx: number) => setPinnedIndex(idx), []);
  const onHoverWall = useCallback((idx: number) => setHoverIndex(idx), []);
  const onLeaveWall = useCallback(() => setHoverIndex(null), []);
  const ready = photoUrls.length > 0;

  const nameFontSize = fitFontSize(nameLine, NAME_SRC.w, 44);

  return (
    <div ref={shellRef} className="absolute inset-0 overflow-hidden bg-[#120608]">
      {loading ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 px-6">
          <div className="w-full max-w-xs">
            <CmProgressBar label="Modellenfiche laden…" />
          </div>
        </div>
      ) : null}

      {!loading && error && !photoUrls.length ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black p-6 text-center text-sm text-white/70">
          {error}
        </div>
      ) : null}

      {ready ? (
        <div
          className="absolute left-1/2 top-1/2 origin-center [container-type:size]"
          style={{
            width: BASE_W,
            height: BASE_H,
            transform: `translate(calc(-50% + ${coverShiftX}px), -50%) scale(${coverScale})`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BG}
            alt=""
            className="absolute inset-0 h-full w-full select-none object-fill"
            draggable={false}
          />

          {/* Zijmuur links — kleine foto's als dikke canvassen */}
          <div className="absolute inset-0 z-10 overflow-visible">
            {GRID_QUADS.map((quad, idx) => {
              const src = photoUrls[idx];
              if (!src) return null;
              const srcSize = quadSourceSize(quad);
              return (
                <QuadPhotoPin
                  key={`grid-${idx}`}
                  src={src}
                  quad={quad}
                  srcW={srcSize.w}
                  srcH={srcSize.h}
                  framePx={0}
                  frameDepthPx={CANVAS_DEPTH_SMALL}
                  frameDepthColor={CANVAS_EDGE}
                  showShadow
                  fit="cover"
                  tone="natural"
                  objectPosition="center top"
                  active={slideIndex === idx}
                  onClick={() => onPinWall(idx)}
                  onMouseEnter={() => onHoverWall(idx)}
                  onMouseLeave={onLeaveWall}
                />
              );
            })}
          </div>

          {/* Naam van het model — rechtsboven op de achtermuur, met gloed */}
          {nameLine ? (
            <div className="absolute inset-0 z-[14] overflow-visible pointer-events-none">
              <QuadWallText quad={NAME_QUAD} srcW={NAME_SRC.w} srcH={NAME_SRC.h}>
                <GlowWallName text={nameLine} fontSize={nameFontSize} />
              </QuadWallText>
            </div>
          ) : null}

          {/* Modellengallerij — onder de foto's op de achtermuur */}
          <div className="absolute inset-0 z-[14] overflow-visible pointer-events-none">
            <QuadWallText quad={LABEL_QUAD} srcW={LABEL_SRC.w} srcH={LABEL_SRC.h}>
              <PaintedWallLabel
                text="Modellengallerij"
                fontSize={fitFontSize('Modellengallerij', LABEL_SRC.w, 34)}
              />
            </QuadWallText>
          </div>

          {/* Linkermuur — hoofdfoto als dik canvas (pointer-events uit: hover op fotomuur blijft werken) */}
          {heroSrc ? (
            <div className="absolute inset-0 z-[12] overflow-visible pointer-events-none">
              {/* warme backlight-gloed achter het canvas (ref. beeld 2) */}
              <div
                aria-hidden
                className="absolute"
                style={{
                  left: HERO_QUAD.tl[0] - 46,
                  top: HERO_QUAD.tl[1] - 40,
                  width: HERO_QUAD.tr[0] - HERO_QUAD.tl[0] + 92,
                  height: HERO_QUAD.bl[1] - HERO_QUAD.tl[1] + 84,
                  background:
                    'radial-gradient(ellipse at center, rgba(255,214,160,0.55) 0%, rgba(255,206,150,0.25) 55%, rgba(255,200,140,0) 78%)',
                  filter: 'blur(14px)',
                }}
              />
              <QuadPhotoPin
                src={heroSrc}
                quad={HERO_QUAD}
                srcW={HERO_SRC.w}
                srcH={HERO_SRC.h}
                framePx={0}
                frameDepthPx={CANVAS_DEPTH_HERO}
                frameDepthColor={CANVAS_EDGE}
                showShadow
                fit="cover"
                tone="natural"
                objectPosition="center 12%"
              />
            </div>
          ) : null}

          {/* Achtermuur rechts — maten als geschilderde muurtekst (ref. beeld 2) */}
          <div className="absolute inset-0 z-20 overflow-visible pointer-events-none">
            <QuadWallText quad={STATS_QUAD} srcW={STATS_SRC.w} srcH={STATS_SRC.h}>
              <div className="flex h-full w-full flex-col pt-[4px]">
                <dl className="m-0 grid gap-y-[13px] p-0" style={{ gridTemplateColumns: '46% 54%' }}>
                  {stats.map(([label, value]) => (
                    <div key={label} className="contents">
                      <dt
                        className="whitespace-nowrap font-serif font-normal"
                        style={{
                          fontSize: 17,
                          letterSpacing: '0.04em',
                          color: 'rgba(112,74,42,0.92)',
                          textShadow: '0 1px 1px rgba(255,240,214,0.5)',
                        }}
                      >
                        {label}
                      </dt>
                      <dd
                        className="m-0 whitespace-nowrap font-serif font-normal"
                        style={{
                          fontSize: 17,
                          letterSpacing: '0.04em',
                          color: 'rgba(94,60,32,0.95)',
                          textShadow: '0 1px 1px rgba(255,240,214,0.5)',
                        }}
                      >
                        {statValueCase(value)}
                      </dd>
                    </div>
                  ))}
                </dl>

                {availInline ? (
                  <>
                    <span
                      aria-hidden
                      style={{
                        marginTop: 20,
                        height: 1,
                        width: '92%',
                        background:
                          'linear-gradient(to right, rgba(150,102,58,0.55), rgba(150,102,58,0.05))',
                      }}
                    />
                    <p
                      className="m-0 whitespace-nowrap font-serif"
                      style={{
                        marginTop: 14,
                        fontSize: 13.5,
                        letterSpacing: '0.1em',
                        color: 'rgba(112,74,42,0.85)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Beschikbaar voor
                    </p>
                    <p
                      className="m-0 font-serif"
                      style={{
                        marginTop: 8,
                        fontSize: 14.5,
                        lineHeight: 1.5,
                        letterSpacing: '0.03em',
                        color: 'rgba(94,60,32,0.92)',
                        whiteSpace: 'normal',
                      }}
                    >
                      {availInline}
                    </p>
                  </>
                ) : null}
              </div>
            </QuadWallText>
          </div>
        </div>
      ) : null}
    </div>
  );
}
