'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { ShowroomDeskMenu } from '@/components/model-portal/ShowroomDeskMenu';
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
const BG = `${SHEET_BASE}/images/showroom-room-bg-v5.jpg`;

const BASE_W = layout.base.width;
const BASE_H = layout.base.height;
/** Linkermuur-segment — grote hoofdfoto met backlight. */
const HERO_QUAD = layout.hero as Quad;
/** Rechtermuur — 8 kleine foto's (2 rijen van 4, 2:3) met muurperspectief. */
const GRID_QUADS = layout.grid as Quad[];
/** Rechtermuur — maten rechts van de kleine foto's, op fotohoogte. */
const STATS_QUAD = layout.statsWall as Quad;
/** Linkermuur — naamplakkaat boven de hoofdfoto, links uitgelijnd met de foto. */
const NAME_QUAD = layout.nameWall as Quad;
/** Rechtermuur — "Modellengallerij" onder de foto's. */
const LABEL_QUAD = layout.galleryLabel as Quad;
/** Rechtermuur — beschikbaarheden onder de maten, links uitgelijnd. */
const AVAIL_QUAD = layout.availWall as Quad;

/** Beeld op 80% van de sitebreedte; is het hoger dan het scherm, dan kan er gescrold worden. */
const WIDTH_FRACTION = 0.8;

const HERO_SRC = quadSourceSize(HERO_QUAD);
const STATS_SRC = quadSourceSize(STATS_QUAD);
const NAME_SRC = quadSourceSize(NAME_QUAD);
const LABEL_SRC = quadSourceSize(LABEL_QUAD);
const AVAIL_SRC = quadSourceSize(AVAIL_QUAD);

/**
 * Supersampling: tekst 2x zo groot renderen en door de homografie laten
 * verkleinen → gestoken scherpe letters (zelfde truc als het gastendeskmenu).
 */
const NAME_SS = 2;

/** Dikke galerij-kaders: espresso lijst met dikte tegen de muur. */
const CANVAS_DEPTH_SMALL = 9;
const CANVAS_DEPTH_HERO = 14;
const CANVAS_EDGE = '#241a16';
const FRAME_SMALL_PX = 4;
const FRAME_HERO_PX = 6;
const FRAME_COLOR = '#191009';

/** Naam van het model — donker plakkaat met dikke, wit verlichte letters (2x supersampled). */
function NamePlaque({ text, fontSize }: { text: string; fontSize: number }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{
        background:
          'linear-gradient(140deg, #1a120c 0%, #2a1c13 45%, #140d09 100%)',
        border: `${2 * NAME_SS}px solid rgba(206,162,104,0.55)`,
        borderRadius: 5 * NAME_SS,
        boxShadow: [
          `inset 0 0 ${22 * NAME_SS}px rgba(0,0,0,0.85)`,
          `inset 0 ${NAME_SS}px 0 rgba(255,222,172,0.22)`,
          `0 ${6 * NAME_SS}px ${18 * NAME_SS}px rgba(28,14,4,0.5)`,
        ].join(', '),
      }}
    >
      <span
        className="whitespace-nowrap font-serif font-bold leading-none"
        style={{
          fontSize,
          letterSpacing: '0.09em',
          color: '#ffffff',
          textShadow: [
            `0 0 ${Math.round(fontSize * 0.22)}px rgba(255,255,255,0.95)`,
            `0 0 ${Math.round(fontSize * 0.55)}px rgba(255,246,226,0.75)`,
            `0 0 ${Math.round(fontSize * 1.1)}px rgba(255,232,188,0.45)`,
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
    letterSpacing: '0.12em',
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
  const [scale, setScale] = useState(1);
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
      const s = (el.clientWidth * WIDTH_FRACTION) / BASE_W;
      setScale(s > 0 ? s : 1);
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
        .join(' · ')
    : '';

  const onPinWall = useCallback((idx: number) => setPinnedIndex(idx), []);
  const onHoverWall = useCallback((idx: number) => setHoverIndex(idx), []);
  const onLeaveWall = useCallback(() => setHoverIndex(null), []);
  const ready = photoUrls.length > 0;

  const nameFontSize = fitFontSize(nameLine, NAME_SRC.w * NAME_SS * 0.9, 36 * NAME_SS);

  return (
    <div
      ref={shellRef}
      className="absolute inset-0 overflow-y-auto overflow-x-hidden bg-[#120608]"
    >
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
          className="relative mx-auto"
          style={{ width: BASE_W * scale, height: BASE_H * scale }}
        >
        <div
          className="absolute left-0 top-0 origin-top-left [container-type:size]"
          style={{
            width: BASE_W,
            height: BASE_H,
            transform: `scale(${scale})`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BG}
            alt=""
            className="absolute inset-0 h-full w-full select-none object-fill"
            draggable={false}
          />

          {/* Rechtermuur — kleine foto's als dikke canvassen */}
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

          {/* Naamplakkaat — boven de hoofdfoto, links uitgelijnd met de foto */}
          {nameLine ? (
            <div className="absolute inset-0 z-[14] overflow-visible pointer-events-none">
              <QuadWallText
                quad={NAME_QUAD}
                srcW={Math.round(NAME_SRC.w * NAME_SS)}
                srcH={Math.round(NAME_SRC.h * NAME_SS)}
              >
                <NamePlaque text={nameLine} fontSize={nameFontSize} />
              </QuadWallText>
            </div>
          ) : null}

          {/* Modellengallerij — onder de foto's op de rechtermuur */}
          <div className="absolute inset-0 z-[14] overflow-visible pointer-events-none">
            <QuadWallText quad={LABEL_QUAD} srcW={LABEL_SRC.w} srcH={LABEL_SRC.h}>
              <PaintedWallLabel
                text="Modellengallerij"
                fontSize={fitFontSize('Modellengallerij', LABEL_SRC.w, 42)}
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

          {/* Rechtermuur — maten rechts van de foto's: titels links, waarden rechts uitgelijnd */}
          <div className="absolute inset-0 z-20 overflow-visible pointer-events-none">
            <QuadWallText quad={STATS_QUAD} srcW={STATS_SRC.w} srcH={STATS_SRC.h}>
              <div className="flex h-full w-full flex-col pt-[4px]">
                <dl
                  className="m-0 grid gap-y-[13px] p-0"
                  style={{ gridTemplateColumns: 'auto 1fr', columnGap: 38 }}
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

          {/* Beschikbaarheden — donker plakkaat met wit verlichte tekst en licht achter de plaat */}
          {availInline ? (
            <div className="absolute inset-0 z-20 overflow-visible pointer-events-none">
              <QuadWallText
                quad={AVAIL_QUAD}
                srcW={Math.round(AVAIL_SRC.w * NAME_SS)}
                srcH={Math.round(AVAIL_SRC.h * NAME_SS)}
              >
                <div
                  className="flex h-full w-full flex-col items-center justify-center"
                  style={{
                    background:
                      'linear-gradient(140deg, #1a120c 0%, #2a1c13 45%, #140d09 100%)',
                    border: `${2 * NAME_SS}px solid rgba(206,162,104,0.55)`,
                    borderRadius: 5 * NAME_SS,
                    boxShadow: [
                      `inset 0 0 ${22 * NAME_SS}px rgba(0,0,0,0.85)`,
                      `inset 0 ${NAME_SS}px 0 rgba(255,222,172,0.22)`,
                      // licht dat achter de plaat vandaan komt (backlit)
                      `0 0 ${14 * NAME_SS}px rgba(255,224,178,0.55)`,
                      `0 0 ${34 * NAME_SS}px rgba(255,214,160,0.3)`,
                      `0 ${5 * NAME_SS}px ${16 * NAME_SS}px rgba(28,14,4,0.5)`,
                    ].join(', '),
                  }}
                >
                  <p
                    className="m-0 whitespace-nowrap font-serif"
                    style={{
                      fontSize: 11 * NAME_SS,
                      letterSpacing: '0.16em',
                      color: '#ffffff',
                      textTransform: 'uppercase',
                      textShadow: `0 0 ${6 * NAME_SS}px rgba(255,255,255,0.75)`,
                    }}
                  >
                    Beschikbaar voor
                  </p>
                  <p
                    className="m-0 whitespace-nowrap text-center font-serif"
                    style={{
                      marginTop: 4 * NAME_SS,
                      // serif ≈ 0.58em per teken — alles op één regel binnen de plaat
                      fontSize:
                        Math.min(
                          15,
                          (AVAIL_SRC.w * 0.92) / (availInline.length * 0.58),
                        ) * NAME_SS,
                      letterSpacing: '0.04em',
                      color: '#ffffff',
                      textShadow: `0 0 ${5 * NAME_SS}px rgba(255,246,226,0.6)`,
                    }}
                  >
                    {availInline}
                  </p>
                </div>
              </QuadWallText>
            </div>
          ) : null}

          {/* Kiosk links — menubord van het modellenportaal */}
          <ShowroomDeskMenu currentPage="fiche" />
        </div>
        </div>
      ) : null}
    </div>
  );
}
