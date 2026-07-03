'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { CmProgressBar } from '@/components/CmProgressBar';
import type { CatalogModel } from '@/components/models-catalog/ModelsCatalogGrid';
import { QuadPhotoPin } from '@/components/model-portal/model-gallery-3d/QuadPhotoPin';
import { useDemoPhotoUrls } from '@/components/model-portal/model-gallery-3d/demoPhotoDataUrl';
import {
  AVAIL,
  BASE_H,
  BASE_W,
  HERO_QUAD,
  STATS,
  TEXT,
} from '@/components/model-portal/model-gallery-3d/galleryConfig';
import { quadSourceSize } from '@/components/model-portal/model-gallery-3d/quadTransform';
import layout from '@/components/model-portal/model-gallery-sheet-layout.json';
import { wallPhotoCellStyle } from '@/components/model-portal/wallPhotoLayout';
import {
  showroomAvailLines,
  showroomDisplayName,
  showroomStats,
  showroomSubtitle,
  splitDisplayName,
} from '@/components/model-portal/model-gallery-3d/showroomTextData';
import { useShowroomGallery } from '@/components/model-portal/model-gallery-3d/useShowroomGallery';

const SHEET_BASE = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';
const SHEET_BG = `${SHEET_BASE}/images/model-gallery-sheet-bg.png`;

const COPPER = '#e8b88a';
const COPPER_DIM = 'rgba(232,184,138,0.72)';
const TEXT_WHITE = 'rgba(255,255,255,0.88)';

const HERO_SRC = quadSourceSize(HERO_QUAD);

type WallPlane = {
  hingeLeft: number;
  top: number;
  height: number;
  width: number;
  rotateY: number;
  skewY?: number;
  perspective: number;
  gapX: number;
  gapY: number;
  padX: number;
  padLeft?: number;
  padRight?: number;
  padY: number;
  photoScale?: number;
  photoRightDropPx?: number;
};

const WALL_PLANE = layout.leftWallPlane as WallPlane;

function pct(v: number): string {
  return `${v}%`;
}

function pctX(px: number): string {
  return `${(px / BASE_W) * 100}%`;
}

function pctY(px: number): string {
  return `${(px / BASE_H) * 100}%`;
}

function sheetFont(sizePx: number): string {
  return `calc(${sizePx} / ${BASE_W} * 100cqw)`;
}

function WallPhotoCell({
  src,
  active,
  onClick,
  scale = 1,
}: {
  src: string;
  active: boolean;
  onClick: () => void;
  scale?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative max-h-full justify-self-center overflow-hidden border-0 p-0 outline-none ${active ? 'brightness-110' : 'hover:brightness-105'}`}
      style={{
        ...wallPhotoCellStyle(WALL_PLANE, layout.base.width, scale),
        boxShadow:
          'inset 0 0 0 1.2px #c5a07d, inset 0 0 0 2px rgba(0,0,0,0.35), 2px 6px 14px rgba(0,0,0,0.45)',
      }}
      aria-label="Galerijfoto"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="block h-full w-full object-cover object-top grayscale contrast-[1.06] brightness-[0.94]"
        draggable={false}
      />
    </button>
  );
}

export function ModelGalleryShowroom({
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
  const [slideIndex, setSlideIndex] = useState(0);

  const demoUrls = useDemoPhotoUrls();
  const photoUrls = demo ? demoUrls : gallery.photoUrls;
  const model = demo ? null : gallery.model;
  const loading = demo ? false : gallery.loading;
  const error = demo ? null : gallery.error;

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const update = () => {
      const s = Math.min(el.clientWidth / BASE_W, el.clientHeight / BASE_H);
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

  const displayName = demo
    ? 'ISABELLA VAN DER MEER'
    : model
      ? showroomDisplayName(model, isAdmin).toUpperCase()
      : '';
  const { first: nameFirst, last: nameLast } = demo
    ? { first: 'ISABELLA', last: 'VAN DER MEER' }
    : splitDisplayName(displayName);
  const subtitle = demo ? 'INTERNATIONAL MODEL' : model ? showroomSubtitle(model).toUpperCase() : '';
  const avail = demo ? AVAIL.map((a) => a.toUpperCase()) : model ? showroomAvailLines(model.beschikbaar) : [];
  const stats = demo ? STATS : model ? showroomStats(model) : [];

  const onSelectWall = useCallback((idx: number) => setSlideIndex(idx), []);

  const ready = photoUrls.length > 0;

  return (
    <div ref={shellRef} className="absolute inset-0 flex items-center justify-center bg-black">
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
          className="relative max-h-full max-w-full shadow-2xl [container-type:inline-size]"
          style={{
            width: BASE_W * scale,
            height: BASE_H * scale,
          }}
        >
          <div
            className="absolute left-0 top-0 origin-top-left overflow-visible"
            style={{
              width: BASE_W,
              height: BASE_H,
              transform: `scale(${scale})`,
            }}
          >
            {/* Achtergrond — fotorealistische galerij (foto 20) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SHEET_BG}
              alt=""
              className="absolute inset-0 h-full w-full select-none object-fill"
              draggable={false}
            />

            {/* 8 muurfoto's — één 3D-vlak (rotateY), zoals referentie bijlage 2 */}
            <div
              className="absolute inset-0 z-10"
              style={{
                perspective: `${WALL_PLANE.perspective}px`,
                perspectiveOrigin: `${WALL_PLANE.hingeLeft}% 45%`,
              }}
            >
              <div
                className="absolute"
                style={{
                  top: pct(WALL_PLANE.top),
                  height: pct(WALL_PLANE.height),
                  right: pct(100 - WALL_PLANE.hingeLeft),
                  width: pct(WALL_PLANE.width),
                  transformOrigin: 'right center',
                  transform: `rotateY(${WALL_PLANE.rotateY}deg)`,
                  transformStyle: 'preserve-3d',
                }}
              >
                <div
                  className="grid h-full w-full grid-cols-4 grid-rows-2 place-items-center overflow-visible"
                  style={{
                    transformOrigin: 'left center',
                    transform: `skewY(${WALL_PLANE.skewY ?? 0}deg)`,
                    columnGap: `${WALL_PLANE.gapX}%`,
                    rowGap: `${WALL_PLANE.gapY}%`,
                    padding: `${WALL_PLANE.padY}% ${WALL_PLANE.padRight ?? WALL_PLANE.padX}% ${WALL_PLANE.padY}% ${WALL_PLANE.padLeft ?? WALL_PLANE.padX}%`,
                  }}
                >
                {Array.from({ length: 8 }).map((_, idx) => {
                  const src = photoUrls[idx];
                  if (!src) return <div key={`empty-${idx}`} className="min-h-0 min-w-0" aria-hidden />;
                  return (
                    <WallPhotoCell
                      key={`wall-${idx}`}
                      src={src}
                      scale={WALL_PLANE.photoScale ?? 1}
                      active={slideIndex === idx}
                      onClick={() => onSelectWall(idx)}
                    />
                  );
                })}
                </div>
              </div>
            </div>

            {/* Hero — corner-pin, onderkant horizontaal */}
            {heroSrc ? (
              <div className="absolute inset-0 z-[15] overflow-visible">
                <QuadPhotoPin
                  src={heroSrc}
                  quad={HERO_QUAD}
                  srcW={HERO_SRC.w}
                  srcH={HERO_SRC.h}
                  framePx={1.5}
                />
              </div>
            ) : null}

            {/* Tekst op muren — geen overlay boven scherm */}
            {nameFirst ? (
              <p
                className="absolute z-10 whitespace-nowrap font-serif font-normal uppercase"
                style={{
                  left: pctX(TEXT.nameFirst.x),
                  top: pctY(TEXT.nameFirst.y),
                  fontSize: sheetFont(TEXT.nameFirst.size),
                  letterSpacing: `${TEXT.nameFirst.tracking}em`,
                  color: COPPER,
                  textShadow: '0 0 0.8cqw rgba(232,184,138,0.55)',
                }}
              >
                {nameFirst}
              </p>
            ) : null}
            {nameLast ? (
              <p
                className="absolute z-10 whitespace-nowrap font-serif font-normal uppercase"
                style={{
                  left: pctX(TEXT.nameLast.x),
                  top: pctY(TEXT.nameLast.y),
                  fontSize: sheetFont(TEXT.nameLast.size),
                  letterSpacing: `${TEXT.nameLast.tracking}em`,
                  color: COPPER,
                  textShadow: '0 0 1cqw rgba(232,184,138,0.6)',
                }}
              >
                {nameLast}
              </p>
            ) : null}

            <p
              className="absolute z-10 whitespace-nowrap font-sans font-light uppercase"
              style={{
                left: pctX(TEXT.subtitle.x),
                top: pctY(TEXT.subtitle.y),
                fontSize: sheetFont(TEXT.subtitle.size),
                letterSpacing: `${TEXT.subtitle.tracking}em`,
                color: TEXT_WHITE,
              }}
            >
              {subtitle}
            </p>

            <div
              className="absolute z-10 h-px bg-gradient-to-r from-transparent via-[#e8b88a]/75 to-transparent"
              style={{
                left: pctX(TEXT.divider.x),
                top: pctY(TEXT.divider.y),
                width: pctX(TEXT.divider.w),
              }}
              aria-hidden
            />

            <p
              className="absolute z-10 whitespace-nowrap font-sans font-medium uppercase"
              style={{
                left: pctX(TEXT.availTitle.x),
                top: pctY(TEXT.availTitle.y),
                fontSize: sheetFont(TEXT.availTitle.size),
                letterSpacing: `${TEXT.availTitle.tracking}em`,
                color: 'rgba(255,255,255,0.78)',
              }}
            >
              Available For
            </p>
            <ul className="absolute z-10 m-0 list-none p-0" style={{ left: pctX(TEXT.availList.x), top: pctY(TEXT.availList.y) }}>
              {avail.map((line, i) => (
                <li
                  key={line}
                  className="whitespace-nowrap font-sans font-light uppercase"
                  style={{
                    marginTop: i === 0 ? 0 : pctY(TEXT.availList.line),
                    fontSize: sheetFont(TEXT.availList.size),
                    letterSpacing: `${TEXT.availList.tracking}em`,
                    color: TEXT_WHITE,
                  }}
                >
                  {line}
                </li>
              ))}
            </ul>

            <p
              className="absolute z-10 whitespace-nowrap font-serif uppercase"
              style={{
                left: pctX(TEXT.statsTitle.x),
                top: pctY(TEXT.statsTitle.y),
                fontSize: sheetFont(TEXT.statsTitle.size),
                letterSpacing: `${TEXT.statsTitle.tracking}em`,
                color: COPPER,
                transform: 'translateX(-100%)',
              }}
            >
              Model Stats
            </p>
            <dl className="absolute z-10 m-0 p-0" style={{ top: pctY(TEXT.statsList.y) }}>
              {stats.map(([label, value], i) => (
                <div
                  key={label}
                  className="absolute whitespace-nowrap"
                  style={{ top: i === 0 ? 0 : pctY(TEXT.statsList.line * i) }}
                >
                  <dt
                    className="absolute font-sans font-medium uppercase"
                    style={{
                      left: pctX(TEXT.statsList.labelX),
                      fontSize: sheetFont(TEXT.statsList.size),
                      letterSpacing: `${TEXT.statsList.tracking}em`,
                      color: COPPER_DIM,
                      transform: 'translateX(-100%)',
                    }}
                  >
                    {label}
                  </dt>
                  <dd
                    className="absolute font-sans font-light uppercase"
                    style={{
                      left: pctX(TEXT.statsList.valueX),
                      fontSize: sheetFont(TEXT.statsList.size),
                      letterSpacing: `${TEXT.statsList.tracking}em`,
                      color: TEXT_WHITE,
                      transform: 'translateX(-100%)',
                    }}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      ) : null}

      {ready ? (
        <p className="pointer-events-none absolute bottom-4 left-4 z-20 rounded-full border border-white/15 bg-black/50 px-3 py-1 text-[10px] uppercase tracking-wider text-white/70 backdrop-blur-sm">
          Foto {slideIndex + 1} / 8 — klik op muurfoto
        </p>
      ) : null}
    </div>
  );
}
