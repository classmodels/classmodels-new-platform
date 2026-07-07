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
/** Achtermuur — 8 kleine foto's (2 rijen van 4, 2:3) met muurperspectief. */
const GRID_QUADS = layout.grid as Quad[];
/** Achtermuur rechts — maten van het model onder de naam. */
const STATS_QUAD = layout.statsWall as Quad;
/** Achtermuur rechts — naam van het model, op fotohoogte en op de maten-kolomlijn. */
const NAME_QUAD = layout.nameWall as Quad;
/** Achtermuur — "Modellengallerij" onder de foto's. */
const LABEL_QUAD = layout.galleryLabel as Quad;
/** Achtermuur — beschikbaarheden onderaan de muur. */
const AVAIL_QUAD = layout.availWall as Quad;

/** Max. crop links (hero begint op ±70px) en rechts (naam/maten tot ±1445px). */
const CROP_L_MAX = 60;
const CROP_R_MAX = 180;
/** Breedte die altijd zichtbaar moet blijven; smaller schalen we niet (dan liever randen boven/onder). */
const SAFE_MIN_W = BASE_W - CROP_L_MAX - CROP_R_MAX;

const HERO_SRC = quadSourceSize(HERO_QUAD);
const STATS_SRC = quadSourceSize(STATS_QUAD);
const NAME_SRC = quadSourceSize(NAME_QUAD);
const LABEL_SRC = quadSourceSize(LABEL_QUAD);
const AVAIL_SRC = quadSourceSize(AVAIL_QUAD);

/** Dikke galerij-kaders: espresso lijst met dikte tegen de muur. */
const CANVAS_DEPTH_SMALL = 9;
const CANVAS_DEPTH_HERO = 14;
const CANVAS_EDGE = '#241a16';
const FRAME_SMALL_PX = 4;
const FRAME_HERO_PX = 6;
const FRAME_COLOR = '#191009';

/** Naam rechtsboven op de muur — warme serif met zachte backlight-gloed (ref. beeld 2). */
function GlowWallName({ text, fontSize }: { text: string; fontSize: number }) {
  const typo = {
    fontSize,
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap' as const,
  };
  return (
    <div className="relative flex h-full w-full items-start justify-start font-serif font-medium leading-none">
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 select-none"
        style={{ ...typo, color: 'rgba(255,214,150,0.6)', filter: 'blur(10px)' }}
      >
        {text}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 select-none"
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

/** Muurlabel "Modellengallerij" — strak en scherp, zoals het referentiebeeld. */
function PaintedWallLabel({ text, fontSize }: { text: string; fontSize: number }) {
  const typo = {
    fontSize,
    letterSpacing: '0.06em',
    whiteSpace: 'nowrap' as const,
  };
  return (
    <div className="relative flex h-full w-full items-center font-serif font-medium leading-none">
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 select-none"
        style={{ ...typo, color: 'rgba(70,42,20,0.28)', transform: 'translateY(1.5px)' }}
      >
        {text}
      </span>
      <span
        className="relative"
        style={{
          ...typo,
          color: 'rgba(126,84,44,0.98)',
          textShadow: '0 1px 1px rgba(255,240,214,0.45)',
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
                  framePx={FRAME_SMALL_PX}
                  frameColor={FRAME_COLOR}
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
                framePx={FRAME_HERO_PX}
                frameColor={FRAME_COLOR}
                frameDepthPx={CANVAS_DEPTH_HERO}
                frameDepthColor={CANVAS_EDGE}
                showShadow
                fit="cover"
                tone="natural"
                objectPosition="center 12%"
              />
            </div>
          ) : null}

          {/* Achtermuur rechts — maten: titels links uitgelijnd, waarden rechts uitgelijnd */}
          <div className="absolute inset-0 z-20 overflow-visible pointer-events-none">
            <QuadWallText quad={STATS_QUAD} srcW={STATS_SRC.w} srcH={STATS_SRC.h}>
              <div className="flex h-full w-full flex-col pt-[4px]">
                <dl
                  className="m-0 grid gap-y-[13px] p-0"
                  style={{ gridTemplateColumns: 'auto 1fr', columnGap: 56 }}
                >
                  {stats.map(([label, value]) => (
                    <div key={label} className="contents">
                      <dt
                        className="whitespace-nowrap text-left font-serif font-normal"
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
                        className="m-0 whitespace-nowrap text-right font-serif font-normal"
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
              </div>
            </QuadWallText>
          </div>

          {/* Beschikbaarheden — onderaan de muur, alles op één regel */}
          {availInline ? (
            <div className="absolute inset-0 z-20 overflow-visible pointer-events-none">
              <QuadWallText quad={AVAIL_QUAD} srcW={AVAIL_SRC.w} srcH={AVAIL_SRC.h}>
                <div className="flex h-full w-full flex-col items-end justify-end pb-[2px]">
                  <p
                    className="m-0 whitespace-nowrap font-serif"
                    style={{
                      fontSize: 13,
                      letterSpacing: '0.14em',
                      color: 'rgba(74,44,20,0.95)',
                      textTransform: 'uppercase',
                      textShadow: '0 1px 1px rgba(255,240,214,0.4)',
                    }}
                  >
                    Beschikbaar voor
                  </p>
                  <p
                    className="m-0 whitespace-nowrap font-serif"
                    style={{
                      marginTop: 9,
                      // serif ≈ 0.55em per teken — één regel passend binnen de strook
                      fontSize: Math.min(16, (AVAIL_SRC.w * 0.97) / (availInline.length * 0.58)),
                      letterSpacing: '0.03em',
                      color: 'rgba(64,38,18,0.95)',
                      textShadow: '0 1px 1px rgba(255,240,214,0.4)',
                    }}
                  >
                    {availInline}
                  </p>
                </div>
              </QuadWallText>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
