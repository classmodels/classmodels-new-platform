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
const BG = `${SHEET_BASE}/images/showroom-room-bg.png`;

const BASE_W = layout.base.width;
const BASE_H = layout.base.height;
/** Voormuur (rechts) — hoofdfoto, hoekpunten volgen de muurlijnen. */
const HERO_QUAD = layout.hero as Quad;
/** Zijmuur (links) — 8 kleine foto's met muurperspectief. */
const GRID_QUADS = layout.grid as Quad[];
/** Achtermuur (midden) — Model Stats, tekst volgt het muurvlak. */
const STATS_QUAD = layout.statsWall as Quad;
/** Zijmuur — naam van het model boven de foto's. */
const NAME_QUAD = layout.nameWall as Quad;
/** Zijmuur — "Modellen Gallerij" onder de foto's. */
const LABEL_QUAD = layout.galleryLabel as Quad;
/** Zwarte verhoging (balk) onderaan — beschikbaarheden. */
const BALK_QUAD = layout.balk as Quad;

const HERO_SRC = quadSourceSize(HERO_QUAD);
const STATS_SRC = quadSourceSize(STATS_QUAD);
const NAME_SRC = quadSourceSize(NAME_QUAD);
const LABEL_SRC = quadSourceSize(LABEL_QUAD);
const BALK_SRC = quadSourceSize(BALK_QUAD);

/** Canvasdikte (px in bronrechthoek) — foto's hangen als dikke doeken. */
const CANVAS_DEPTH_SMALL = 5;
const CANVAS_DEPTH_HERO = 9;
const CANVAS_EDGE = '#241a16';

const COPPER_BRIGHT = '#f0c89a';
const COPPER_DIM = 'rgba(232,184,138,0.85)';
const TEXT_WHITE = 'rgba(255,246,236,0.94)';
const STATS_GLOW = '0 0 14px rgba(232,184,138,0.55), 0 0 34px rgba(232,184,138,0.28)';

const NAME_DEPTH_LAYERS = 6;

/** Naam met dikte: schaduw achter, bronzen zijkant-lagen, verlicht front. */
function ExtrudedWallName({ text, fontSize }: { text: string; fontSize: number }) {
  const step = Math.max(0.8, fontSize * 0.028);
  const sideX = Math.max(0.4, fontSize * 0.014);
  const depth = NAME_DEPTH_LAYERS * step;
  const typo = {
    fontSize,
    letterSpacing: '0.1em',
    whiteSpace: 'nowrap' as const,
  };

  return (
    <div className="relative flex h-full w-full items-end font-serif font-medium uppercase leading-none">
      {/* zachte slagschaduw op de muur, dicht achter de letters */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 select-none"
        style={{
          ...typo,
          transform: `translate(${depth * 0.8 + 2}px, ${depth + 4}px)`,
          color: 'rgba(0,0,0,0.38)',
          filter: 'blur(4px)',
        }}
      >
        {text}
      </span>
      {/* zijkanten van de letters (dikte) */}
      {Array.from({ length: NAME_DEPTH_LAYERS }, (_, i) => {
        const layer = NAME_DEPTH_LAYERS - i;
        const bronze = Math.round(168 - layer * 13);
        return (
          <span
            key={layer}
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 select-none"
            style={{
              ...typo,
              transform: `translate(${sideX * layer}px, ${step * layer}px)`,
              color: `rgb(${bronze}, ${Math.round(bronze * 0.62)}, ${Math.round(bronze * 0.38)})`,
            }}
          >
            {text}
          </span>
        );
      })}
      {/* verlicht front */}
      <span
        className="relative"
        style={{
          ...typo,
          color: '#fffdf8',
          WebkitTextStroke: `${Math.max(0.6, fontSize * 0.022)}px rgba(212,165,116,0.5)`,
          textShadow: [
            '1px 1px 0 rgba(255,250,235,0.85)',
            '0 -1px 0 rgba(255,250,235,0.5)',
            `0 0 ${fontSize * 0.38}px rgba(255,225,180,0.95)`,
            `0 0 ${fontSize * 0.85}px rgba(240,195,140,0.7)`,
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
    <div className="relative flex h-full w-full items-center font-serif font-semibold uppercase leading-none">
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
      // "contain": hele kamer altijd zichtbaar (niets boven/onder afgesneden)
      const s = Math.min(el.clientWidth / BASE_W, el.clientHeight / BASE_H);
      setCoverScale(s > 0 ? s : 1);
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

  const nameLine = activeModel
    ? showroomDisplayName(activeModel, isAdmin).toUpperCase()
    : '';
  const stats = activeModel ? showroomStats(activeModel) : [];
  /** Alle beschikbaarheden op één regel. */
  const availInline = activeModel?.beschikbaar?.length
    ? activeModel.beschikbaar
        .map((b) => b.trim())
        .filter(Boolean)
        .join('  -  ')
        .toUpperCase()
    : '';

  const onPinWall = useCallback((idx: number) => setPinnedIndex(idx), []);
  const onHoverWall = useCallback((idx: number) => setHoverIndex(idx), []);
  const onLeaveWall = useCallback(() => setHoverIndex(null), []);
  const ready = photoUrls.length > 0;

  const nameFontSize = fitFontSize(nameLine, NAME_SRC.w, 40);

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
            transform: `translate(-50%, -50%) scale(${coverScale})`,
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

          {/* Naam van het model — verlicht met dikte, boven de foto's op de zijmuur */}
          {nameLine ? (
            <div className="absolute inset-0 z-[14] overflow-visible pointer-events-none">
              <QuadWallText quad={NAME_QUAD} srcW={NAME_SRC.w} srcH={NAME_SRC.h}>
                <ExtrudedWallName text={nameLine} fontSize={nameFontSize} />
              </QuadWallText>
            </div>
          ) : null}

          {/* Modellen Gallerij — onder de foto's, in de muurhoek */}
          <div className="absolute inset-0 z-[14] overflow-visible pointer-events-none">
            <QuadWallText quad={LABEL_QUAD} srcW={LABEL_SRC.w} srcH={LABEL_SRC.h}>
              <PaintedWallLabel
                text="Modellen Gallerij"
                fontSize={fitFontSize('Modellen Gallerij', LABEL_SRC.w, 30)}
              />
            </QuadWallText>
          </div>

          {/* Voormuur — hoofdfoto als dik canvas (pointer-events uit: hover op zijmuur blijft werken) */}
          {heroSrc ? (
            <div className="absolute inset-0 z-[12] overflow-visible pointer-events-none">
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

          {/* Achtermuur — Model Stats, groter en in het muurvlak gedraaid */}
          <div className="absolute inset-0 z-20 overflow-visible pointer-events-none">
            <QuadWallText quad={STATS_QUAD} srcW={STATS_SRC.w} srcH={STATS_SRC.h}>
              <div className="flex h-full w-full flex-col px-[12px] pt-[14px]">
                <p
                  className="m-0 whitespace-nowrap font-sans font-normal uppercase leading-none"
                  style={{
                    fontSize: 18,
                    letterSpacing: '0.18em',
                    color: COPPER_BRIGHT,
                    textShadow: STATS_GLOW,
                  }}
                >
                  Model Stats
                </p>
                <span
                  aria-hidden
                  style={{
                    marginTop: 12,
                    height: 1,
                    width: '82%',
                    background:
                      'linear-gradient(to right, rgba(232,184,138,0.65), rgba(232,184,138,0.05))',
                  }}
                />

                <dl className="m-0 p-0" style={{ marginTop: 20 }}>
                  {stats.map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-baseline justify-between"
                      style={{ marginBottom: 17 }}
                    >
                      <dt
                        className="whitespace-nowrap font-sans font-normal uppercase"
                        style={{
                          fontSize: 13.5,
                          letterSpacing: '0.13em',
                          color: COPPER_DIM,
                          textShadow: '0 0 8px rgba(232,184,138,0.35)',
                        }}
                      >
                        {label}
                      </dt>
                      <dd
                        className="m-0 whitespace-nowrap font-sans font-light uppercase"
                        style={{
                          fontSize: 13.5,
                          letterSpacing: '0.09em',
                          color: TEXT_WHITE,
                          textShadow: '0 0 8px rgba(255,255,255,0.22)',
                        }}
                      >
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </QuadWallText>
          </div>

          {/* Zwarte verhoging (balk) — beschikbaar voor links, alles op één regel */}
          {availInline ? (
            <div className="absolute inset-0 z-20 overflow-visible pointer-events-none">
              <QuadWallText quad={BALK_QUAD} srcW={BALK_SRC.w} srcH={BALK_SRC.h}>
                <div className="flex h-full w-full flex-col justify-center px-[6px]">
                  <p
                    className="m-0 whitespace-nowrap font-sans font-normal uppercase leading-none"
                    style={{
                      fontSize: 15,
                      letterSpacing: '0.22em',
                      color: COPPER_DIM,
                      textShadow: '0 0 10px rgba(232,184,138,0.4)',
                    }}
                  >
                    Beschikbaar voor
                  </p>
                  <p
                    className="m-0 whitespace-nowrap font-sans font-light uppercase"
                    style={{
                      marginTop: 11,
                      fontSize: 13.5,
                      letterSpacing: '0.1em',
                      color: TEXT_WHITE,
                      textShadow: '0 0 8px rgba(255,255,255,0.2)',
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
