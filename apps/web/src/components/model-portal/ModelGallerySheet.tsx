'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import Link from 'next/link';
import { getApiBase, publicMediaUrl } from '@/lib/api';
import { CmProgressBar } from '@/components/CmProgressBar';
import type { CatalogModel } from '@/components/models-catalog/ModelsCatalogGrid';
import { adminDownloadFile } from '@/lib/admin-api';
import layout from '@/components/model-portal/model-fiche-simple-layout.json';
import wallLayout from '@/components/model-portal/model-fiche-wall-quads.json';
import { QuadPhotoPin } from '@/components/model-portal/model-gallery-3d/QuadPhotoPin';
import { QuadWallText } from '@/components/model-portal/model-gallery-3d/QuadWallText';
import type { Quad } from '@/components/model-portal/model-gallery-3d/quadTransform';
import {
  buildAngledWallQuads,
  buildWallGalleryLabels,
  buildWallNameQuad,
  quadSourceSize,
  type AngledWallLayout,
  type WallGalleryLabelsConfig,
  type WallNamePlateConfig,
} from '@/components/model-portal/model-gallery-3d/quadTransform';
import { wallLabelFont } from '@/lib/fonts/wall-label-font';
import {
  SHOWCASE_MODEL,
  SHOWCASE_PHOTO_URLS,
} from '@/components/model-portal/model-gallery-3d/showcaseDemoData';
import { SHOWROOM_MODEL_SESSION_KEY } from '@/components/model-portal/model-gallery-3d/useShowroomGallery';

const SHEET_BASE = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';
const SHEET_BG = `${SHEET_BASE}/images/model-fiche1-bg.jpg`;

const BASE_W = layout.base.width;
const BASE_H = layout.base.height;
const WALL_CFG = wallLayout as AngledWallLayout & {
  framePx?: number;
  frameDepthPx?: number;
  frameColor?: string;
  frameDepthColor?: string;
  grid?: Quad[];
  namePlate?: WallNamePlateConfig;
  wallLabel?: WallGalleryLabelsConfig;
};
const WALL_FRAME_PX = WALL_CFG.framePx ?? 3;
const WALL_FRAME_DEPTH_PX = WALL_CFG.frameDepthPx ?? 0;
const WALL_FRAME_COLOR = WALL_CFG.frameColor ?? '#d4a574';
const WALL_FRAME_DEPTH_COLOR = WALL_CFG.frameDepthColor ?? '#5c4228';
const NAME_LETTER_SHRINK_RIGHT = WALL_CFG.namePlate?.letterShrinkRight ?? 0.76;
const WALL_LABEL_CFG = WALL_CFG.wallLabel;
const HERO = layout.hero as {
  quad: Quad;
  borderPx: number;
};

function resolveWallQuads(cfg: typeof WALL_CFG): Quad[] {
  const topRow = cfg.rows?.[0];
  const topCellsValid =
    Array.isArray(topRow?.cells) &&
    topRow.cells.length > 0 &&
    topRow.cells.every(
      (c) =>
        c.width != null &&
        c.width > 0 &&
        c.height != null &&
        c.height > 0 &&
        c.topAngle != null &&
        c.bottomAngle != null,
    );

  if (
    topCellsValid &&
    Array.isArray(cfg.rows) &&
    cfg.rows.length &&
    Array.isArray(cfg.columns) &&
    cfg.columns.length
  ) {
    return buildAngledWallQuads(cfg);
  }
  if (Array.isArray(cfg.grid) && cfg.grid.length) {
    return cfg.grid;
  }
  return [];
}
const TEXT = layout.text as {
  nameLine: { x: number; y: number; size: number; tracking: number };
  age: { size: number; tracking: number; gap: number };
  statsTitle: { x: number; y: number; size: number; tracking: number };
  statsList: { labelX: number; valueX: number; y: number; size: number; line: number; tracking: number };
};
const BOTTOM = layout.bottomBar as {
  top: number;
  padX: number;
  availTitle: { size: number; tracking: number; topPad?: number };
  availList: { size: number; line: number; tracking: number; gapAfterTitle: number };
  availTextPadX?: number;
  actionsPadRight: number;
};

function pct(v: number): string {
  return `${v}%`;
}

const COPPER_BRIGHT = '#f0c89a';
const COPPER_DIM = 'rgba(232,184,138,0.82)';
const TEXT_WHITE = 'rgba(255,255,255,0.94)';
const STATS_GLOW = '0 0 20px rgba(232,184,138,0.75), 0 0 40px rgba(232,184,138,0.35)';

const AVAIL_LABELS: Record<string, string> = {
  Modeshows: 'MODESHOWS',
  'Foto opdrachten': 'EDITORIAL',
  Reklame: 'COMMERCIAL',
  'Host/hostess': 'CAMPAIGNS',
  'Lingerie/Bikini': 'LINGERIE',
  'Artistiek naakt': 'ARTISTIC',
};

function sheetFont(sizePx: number): string {
  return `calc(${sizePx} / ${BASE_W} * 100cqw)`;
}

/** Lettergrootte in canvas-px binnen het quad (zelfde schaal als layout 2560-basis). */
function quadFont(sizePx: number): string {
  return `${sizePx}px`;
}

/** Schaduw + gloed op de voorkant van dikke muurletters. */
function wallLetterLitShadow(scale: number, depth: number): string {
  return [
    `0 ${depth + 3}px ${depth + 6}px rgba(0,0,0,0.55)`,
    `1px 1px 0 rgba(255,250,235,0.85)`,
    `0 -1px 0 rgba(255,250,235,0.5)`,
    `0 0 ${12 * scale}px rgba(255,225,180,0.95)`,
    `0 0 ${28 * scale}px rgba(240,195,140,0.75)`,
  ].join(', ');
}

const WALL_LABEL_FILL = 'rgba(186, 148, 98, 0.9)';
const WALL_LABEL_STROKE = '1.2px rgba(106, 72, 42, 0.36)';
const WALL_LABEL_DEPTH = 'rgba(54, 36, 22, 0.3)';
const WALL_LABEL_BACKLIGHT_CORE = 'rgba(255, 218, 158, 0.95)';
const WALL_LABEL_BACKLIGHT_HALO = 'rgba(255, 198, 128, 0.55)';

/** Helderheid + lichte rand op de voorkant; gloed blijft in de lagen erachter. */
function wallLabelFrontShadow(): string {
  return ['0 -1px 0 rgba(255, 245, 220, 0.55)', '0 1px 2px rgba(0, 0, 0, 0.18)'].join(', ');
}

const WALL_LABEL_PAINT_STYLE = {
  fontFamily: wallLabelFont.style.fontFamily,
  fontWeight: 600,
  whiteSpace: 'nowrap' as const,
  WebkitTextStroke: WALL_LABEL_STROKE,
  paintOrder: 'stroke fill' as const,
};

function WallPaintedVerticalLabel({
  text,
  fontSize,
  letterSpacing,
  letterShrinkRight,
  leftDipDeg,
  leftDropExtraPx,
}: {
  text: string;
  fontSize: string;
  letterSpacing: string;
  letterShrinkRight?: number;
  /** Graden: linkerkant van het woord zakt omlaag t.o.v. rechts. */
  leftDipDeg?: number;
  leftDropExtraPx?: number;
}) {
  const pad = { paddingBottom: '8%', paddingLeft: '2%' };
  const typeStyle = {
    ...WALL_LABEL_PAINT_STYLE,
    letterSpacing,
  };
  const baseSizePx = parseFloat(fontSize);
  const letters = text.split('');
  const useShrink = letterShrinkRight != null && letterShrinkRight < 1 && letters.length > 1;
  const useDip = leftDipDeg != null && leftDipDeg > 0 && letters.length > 1;
  const maxDropPx = (useDip ? leftDipDeg! * 4 : 0) + (leftDropExtraPx ?? 0);

  const renderLetters = (className: string, style: CSSProperties, layer = 'main') =>
    letters.map((ch, i) => {
      const t = letters.length > 1 ? i / (letters.length - 1) : 0;
      const scale = useShrink ? 1 - t * (1 - letterShrinkRight!) : 1;
      const size = useShrink ? quadFont(baseSizePx * scale) : fontSize;
      const dropY = useDip || (leftDropExtraPx ?? 0) > 0 ? (1 - t) * maxDropPx : 0;
      const glyph = ch === ' ' ? '\u00A0' : ch;
      return (
        <span
          key={`${layer}-${ch}-${i}`}
          className={`inline-block align-bottom ${className}`}
          style={{
            ...typeStyle,
            fontSize: size,
            transform: dropY ? `translateY(${dropY}px)` : undefined,
            ...style,
          }}
        >
          {glyph}
        </span>
      );
    });

  const backlightHaloStyle: CSSProperties = {
    color: WALL_LABEL_BACKLIGHT_HALO,
    WebkitTextStroke: '0px transparent',
  };
  const backlightCoreStyle: CSSProperties = {
    color: WALL_LABEL_BACKLIGHT_CORE,
    WebkitTextStroke: '0px transparent',
  };
  const depthStyle: CSSProperties = {
    color: WALL_LABEL_DEPTH,
    WebkitTextStroke: '0px transparent',
  };
  const frontStyle: CSSProperties = {
    color: WALL_LABEL_FILL,
    textShadow: wallLabelFrontShadow(),
  };

  const usePerLetter = useShrink || useDip || (leftDropExtraPx ?? 0) > 0;

  return (
    <p
      className={`m-0 flex h-full items-end uppercase leading-none ${wallLabelFont.className}`}
      style={pad}
    >
      <span className="relative inline-block whitespace-nowrap">
        {usePerLetter ? (
          <>
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-0 z-0 select-none whitespace-nowrap"
              style={{ filter: 'blur(10px)' }}
            >
              {renderLetters('', backlightHaloStyle, 'halo')}
            </span>
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-0 z-0 select-none whitespace-nowrap"
              style={{ filter: 'blur(3px)' }}
            >
              {renderLetters('', backlightCoreStyle, 'core')}
            </span>
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-0 z-[1] select-none whitespace-nowrap"
              style={{ transform: 'translateY(2px)' }}
            >
              {renderLetters('', depthStyle, 'depth')}
            </span>
            <span className="relative z-[2] inline-flex items-end whitespace-nowrap">
              {renderLetters('', frontStyle, 'front')}
            </span>
          </>
        ) : (
          <>
            <span
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 z-0 select-none"
              style={{ ...typeStyle, fontSize, filter: 'blur(10px)', ...backlightHaloStyle }}
            >
              {text}
            </span>
            <span
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 z-0 select-none"
              style={{ ...typeStyle, fontSize, filter: 'blur(3px)', ...backlightCoreStyle }}
            >
              {text}
            </span>
            <span
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 z-[1] select-none"
              style={{
                ...typeStyle,
                fontSize,
                ...depthStyle,
                transform: 'translateY(2px)',
              }}
            >
              {text}
            </span>
            <span className="relative z-[2]" style={{ ...typeStyle, fontSize, ...frontStyle }}>
              {text}
            </span>
          </>
        )}
      </span>
    </p>
  );
}

const WALL_LETTER_DEPTH_LAYERS = 7;

function WallExtrudedLetter({
  ch,
  scale,
  baseSize,
  isLast,
}: {
  ch: string;
  scale: number;
  baseSize: number;
  isLast: boolean;
}) {
  const glyph = ch === ' ' ? '\u00A0' : ch;
  const fontSize = quadFont(baseSize);
  const step = Math.max(1.4, 2.2 * scale);
  const sideX = 0.55 * scale;
  const gapRight = ch === ' ' ? baseSize * 0.28 : baseSize * 0.1;

  return (
    <span
      className="relative inline-block"
      style={{ marginRight: isLast ? 0 : quadFont(gapRight) }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 select-none font-serif font-medium uppercase leading-none"
        style={{
          fontSize,
          transform: `translate(${sideX * 2}px, ${WALL_LETTER_DEPTH_LAYERS * step + 4}px)`,
          color: 'rgba(0,0,0,0.45)',
          filter: `blur(${2 * scale}px)`,
        }}
      >
        {glyph}
      </span>
      {Array.from({ length: WALL_LETTER_DEPTH_LAYERS }, (_, i) => {
        const layer = i + 1;
        const bronze = Math.round(118 - layer * 11);
        return (
          <span
            key={layer}
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 select-none font-serif font-medium uppercase leading-none"
            style={{
              fontSize,
              transform: `translate(${sideX * layer}px, ${step * layer}px)`,
              color: `rgb(${bronze}, ${Math.round(bronze * 0.58)}, ${Math.round(bronze * 0.34)})`,
            }}
          >
            {glyph}
          </span>
        );
      })}
      <span
        className="relative font-serif font-medium uppercase leading-none"
        style={{
          fontSize,
          color: '#fffdf8',
          textShadow: wallLetterLitShadow(scale, WALL_LETTER_DEPTH_LAYERS * step),
          WebkitTextStroke: `${Math.max(0.8, 1.1 * scale)}px rgba(212,165,116,0.55)`,
        }}
      >
        {glyph}
      </span>
    </span>
  );
}

function pos(x: number, y: number): { left: string; top: string } {
  return { left: `${x}px`, top: `${y}px` };
}

function ficheDisplayName(m: CatalogModel, isAdmin: boolean): string {
  const fn = (m.firstName ?? '').trim();
  const ln = (m.lastName ?? '').trim();
  const roster = fn && ln ? `${fn} ${ln}` : fn || ln || m.displayName;
  return (isAdmin ? roster : m.displayName || roster).toUpperCase();
}

function isFullUrl(s: string): boolean {
  return /^https?:\/\//i.test(s) || s.startsWith('/');
}

function toPhotoUrl(keyOrUrl: string): string {
  if (!keyOrUrl) return '';
  return isFullUrl(keyOrUrl) ? keyOrUrl : publicMediaUrl(keyOrUrl);
}

function sheetStr(sh: Record<string, unknown> | undefined, key: string): string {
  if (!sh) return '';
  const v = sh[key];
  if (v == null) return '';
  return String(v).trim();
}

function statCm(raw: string): string {
  const v = raw.trim();
  if (!v) return '—';
  if (/cm$/i.test(v)) return v.toUpperCase();
  if (/^\d+([.,]\d+)?$/.test(v)) return `${v} CM`;
  return v.toUpperCase();
}

function statText(raw: string): string {
  const v = raw.trim();
  return v ? v.toUpperCase() : '—';
}

function availLines(beschikbaar: string[]): string[] {
  return beschikbaar.map((b) => AVAIL_LABELS[b] ?? b.toUpperCase());
}

function padWallUrls(urls: string[]): string[] {
  if (!urls.length) return [];
  const out: string[] = [];
  for (let i = 0; i < 8; i++) out.push(urls[i % urls.length]!);
  return out;
}

function modelStats(m: CatalogModel): [string, string][] {
  const sh = m.sheet ?? {};
  return [
    ['LENGTH', statCm(sheetStr(sh, 'lengte'))],
    ['BUST', statCm(sheetStr(sh, 'borstomtrek'))],
    ['WAIST', statCm(sheetStr(sh, 'taille'))],
    ['HIPS', statCm(sheetStr(sh, 'heupomtrek'))],
    ['SHOES', statText(sheetStr(sh, 'schoenmaat'))],
    ['HAIR', statText(sheetStr(sh, 'haarkleur'))],
    ['EYES', statText(sheetStr(sh, 'kleurOgen'))],
  ];
}

export function ModelGallerySheet({
  m,
  initialPhotoSrc,
  isAdmin,
  token,
  onClose,
  onPrint,
}: {
  m: CatalogModel;
  initialPhotoSrc: string;
  isAdmin: boolean;
  token: string | null;
  onClose: () => void;
  onPrint?: (m: CatalogModel, photoSrc: string) => void;
}) {
  const [detail, setDetail] = useState<CatalogModel | null>(m.sheet ? m : null);
  const [detailErr, setDetailErr] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(!m.sheet);
  const [photoUrls, setPhotoUrls] = useState<string[]>(() => {
    const u = initialPhotoSrc ? toPhotoUrl(initialPhotoSrc) : '';
    if (u) return padWallUrls([u]);
    if (!token) return SHOWCASE_PHOTO_URLS;
    return [];
  });
  const [slideIndex, setSlideIndex] = useState(0);
  const [useShowcase, setUseShowcase] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [coverScale, setCoverScale] = useState(1);

  useEffect(() => {
    shellRef.current?.focus();
  }, []);

  useEffect(() => {
    if (m.sheet) {
      setDetail(m);
      setDetailLoading(false);
      return;
    }
    const h = new Headers();
    if (token) h.set('Authorization', `Bearer ${token}`);
    let cancelled = false;
    setDetailLoading(true);
    setDetailErr(null);
    fetch(`${getApiBase()}/catalog/models/${m.id}`, { headers: h })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json() as Promise<CatalogModel>;
      })
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setDetailErr(e instanceof Error ? e.message : 'Fiche laden mislukt');
          setDetail(m);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [m, token]);

  useEffect(() => {
    let cancelled = false;

    async function loadGallery() {
      const fallback = (): string[] => {
        const fromInitial = initialPhotoSrc ? toPhotoUrl(initialPhotoSrc) : '';
        const fromThumb = m.profileThumbKey ? publicMediaUrl(m.profileThumbKey) : '';
        const u = fromInitial || fromThumb;
        return u ? padWallUrls([u]) : [];
      };

      if (!token) {
        const urls = fallback();
        if (!urls.length) {
          setUseShowcase(true);
          setPhotoUrls(SHOWCASE_PHOTO_URLS);
        } else {
          setPhotoUrls(urls);
        }
        return;
      }

      try {
        const h = new Headers({ Authorization: `Bearer ${token}` });
        const r = await fetch(`${getApiBase()}/catalog/models/${m.id}/gallery`, { headers: h });
        const data = r.ok ? ((await r.json()) as { keys?: string[] }) : { keys: [] };
        const keys = Array.isArray(data.keys) && data.keys.length ? data.keys : [];
        const urls = padWallUrls(keys.map((k) => publicMediaUrl(k)).filter(Boolean));

        if (!cancelled) {
          if (urls.length) {
            setPhotoUrls(urls);
            setSlideIndex(0);
            setUseShowcase(false);
          } else {
            const fb = fallback();
            if (fb.length) {
              setPhotoUrls(fb);
              setSlideIndex(0);
            } else {
              setUseShowcase(true);
              setPhotoUrls(SHOWCASE_PHOTO_URLS);
              setSlideIndex(0);
            }
          }
        }
      } catch {
        if (!cancelled) {
          const fb = fallback();
          if (fb.length) {
            setPhotoUrls(fb);
          } else {
            setUseShowcase(true);
            setPhotoUrls(SHOWCASE_PHOTO_URLS);
          }
        }
      }
    }

    void loadGallery();
    return () => {
      cancelled = true;
    };
  }, [m.id, m.profileThumbKey, token, initialPhotoSrc]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const update = () => {
      const s = Math.max(el.clientWidth / BASE_W, el.clientHeight / BASE_H);
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

  const active = detail ?? m;
  const displayName = ficheDisplayName(active, isAdmin);
  const heroSrc = photoUrls[slideIndex] ?? photoUrls[0] ?? '';
  const stats = useMemo(() => modelStats(active), [active]);
  const wallQuads = useMemo(() => resolveWallQuads(WALL_CFG), []);
  const nameQuad = useMemo(
    () => buildWallNameQuad(WALL_CFG, WALL_CFG.namePlate),
    [],
  );
  const nameSrcSize = useMemo(() => quadSourceSize(nameQuad), [nameQuad]);
  const wallLabelItems = useMemo(
    () => (WALL_LABEL_CFG && wallQuads.length ? buildWallGalleryLabels(WALL_CFG, wallQuads, WALL_LABEL_CFG) : []),
    [wallQuads],
  );
  const nameLetters = useMemo(() => displayName.split(''), [displayName]);
  const heroSrcSize = useMemo(() => quadSourceSize(HERO.quad), []);
  const availInline = (active.beschikbaar?.length ? availLines(active.beschikbaar) : availLines(SHOWCASE_MODEL.beschikbaar)).join(', ');

  const availTitleY = BOTTOM.top + (BOTTOM.availTitle.topPad ?? 18);
  const availListY = availTitleY + BOTTOM.availTitle.size + BOTTOM.availList.gapAfterTitle;
  const availLeft = BOTTOM.padX + (BOTTOM.availTextPadX ?? 28);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (photoUrls.length <= 1) return;
      if (e.key === 'ArrowLeft') setSlideIndex((i) => (i <= 0 ? photoUrls.length - 1 : i - 1));
      if (e.key === 'ArrowRight') setSlideIndex((i) => (i >= photoUrls.length - 1 ? 0 : i + 1));
    },
    [onClose, photoUrls.length],
  );

  const onSelectWall = useCallback((idx: number) => setSlideIndex(idx), []);
  const ready = photoUrls.length > 0;

  return (
    <div
      ref={shellRef}
      className="fixed inset-0 z-[90] h-[100dvh] w-[100dvw] overflow-hidden bg-[#0a0608] outline-none"
      role="presentation"
      onClick={onClose}
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      <div
        ref={canvasRef}
        className="absolute inset-0 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gallery-sheet-name"
        onClick={(e) => e.stopPropagation()}
      >
        {detailLoading ? (
          <div className="absolute inset-x-0 top-3 z-[60] px-6">
            <CmProgressBar label="Modellenfiche laden…" />
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
              src={`${SHEET_BG}?v=2`}
              alt=""
              className="absolute inset-0 h-full w-full select-none object-fill"
              draggable={false}
            />

            {/* Linkermuur — 8 foto's met perspectief-quads (linkerrand langer dan rechterrand) */}
            <div className="absolute inset-0 z-10 overflow-visible">
              {wallQuads.map((quad, idx) => {
                const src = photoUrls[idx];
                if (!src) return null;
                const srcSize = quadSourceSize(quad);
                return (
                  <QuadPhotoPin
                    key={`wall-${idx}-${src}`}
                    src={src}
                    quad={quad}
                    srcW={srcSize.w}
                    srcH={srcSize.h}
                    framePx={WALL_FRAME_PX}
                    frameDepthPx={WALL_FRAME_DEPTH_PX}
                    frameColor={WALL_FRAME_COLOR}
                    frameDepthColor={WALL_FRAME_DEPTH_COLOR}
                    showShadow
                    fit="cover"
                    tone="natural"
                    objectPosition="center top"
                    active={slideIndex === idx}
                    onClick={() => onSelectWall(idx)}
                  />
                );
              })}
            </div>

            {/* Muurlabels onder fotogrid — Modellen + Gallerij */}
            {wallLabelItems.map((item) => {
              const srcSize = quadSourceSize(item.quad);
              return (
                <div key={item.text} className="absolute inset-0 z-[14] overflow-visible pointer-events-none">
                  <QuadWallText quad={item.quad} srcW={srcSize.w} srcH={srcSize.h}>
                    <div className="flex h-full w-full items-end justify-start">
                      <WallPaintedVerticalLabel
                        text={item.text}
                        fontSize={quadFont(item.fontSize)}
                        letterSpacing={`${item.letterSpacing}em`}
                        letterShrinkRight={item.letterShrinkRight}
                        leftDipDeg={item.leftDipDeg}
                        leftDropExtraPx={item.leftDropExtraPx}
                      />
                    </div>
                  </QuadWallText>
                </div>
              );
            })}

            {/* Naam — schuin op linkermuur boven de galerij */}
            <div className="absolute inset-0 z-[15] overflow-visible pointer-events-none">
              <QuadWallText quad={nameQuad} srcW={nameSrcSize.w} srcH={nameSrcSize.h}>
                <p
                  id="gallery-sheet-name"
                  className="m-0 flex h-full items-end whitespace-nowrap font-serif font-normal uppercase leading-none"
                  style={{ paddingBottom: '6%', paddingLeft: '2%' }}
                >
                  {nameLetters.map((ch, i) => {
                    const t = nameLetters.length > 1 ? i / (nameLetters.length - 1) : 0;
                    const scale = 1 - t * (1 - NAME_LETTER_SHRINK_RIGHT);
                    const baseSize = TEXT.nameLine.size * 1.15 * scale;
                    return (
                      <WallExtrudedLetter
                        key={`${ch}-${i}`}
                        ch={ch}
                        scale={scale}
                        baseSize={baseSize}
                        isLast={i === nameLetters.length - 1}
                      />
                    );
                  })}
                </p>
              </QuadWallText>
            </div>

            {/* Hoofdfoto — gouden kader, evenwijdig aan plint en lichtstrook */}
            {heroSrc ? (
              <div className="absolute inset-0 z-[12] overflow-visible">
                <QuadPhotoPin
                  src={heroSrc}
                  quad={HERO.quad}
                  srcW={heroSrcSize.w}
                  srcH={heroSrcSize.h}
                  framePx={HERO.borderPx}
                  frameDepthPx={WALL_FRAME_DEPTH_PX}
                  frameColor={WALL_FRAME_COLOR}
                  frameDepthColor={WALL_FRAME_DEPTH_COLOR}
                  showShadow
                  fit="cover"
                  tone="natural"
                  objectPosition="center 10%"
                />
              </div>
            ) : null}

            {/* Model Stats — rechts van hoofdfoto */}
            <div
              className="absolute left-0 top-0 z-20"
              style={{ width: `${BASE_W}px`, height: `${BASE_H}px` }}
            >
              <p
                className="absolute whitespace-nowrap font-sans font-normal uppercase leading-none"
                style={{
                  ...pos(TEXT.statsTitle.x, TEXT.statsTitle.y),
                  fontSize: sheetFont(TEXT.statsTitle.size),
                  letterSpacing: `${TEXT.statsTitle.tracking}em`,
                  color: COPPER_BRIGHT,
                  textShadow: STATS_GLOW,
                }}
              >
                Model Stats
              </p>

              <dl className="absolute m-0 p-0">
                {stats.map(([label, value], i) => (
                  <div
                    key={label}
                    className="absolute whitespace-nowrap"
                    style={pos(0, TEXT.statsList.y + TEXT.statsList.line * i)}
                  >
                    <dt
                      className="absolute font-sans font-normal uppercase"
                      style={{
                        left: `${TEXT.statsList.labelX}px`,
                        fontSize: sheetFont(TEXT.statsList.size),
                        letterSpacing: `${TEXT.statsList.tracking}em`,
                        color: COPPER_DIM,
                        textShadow: '0 0 8px rgba(232,184,138,0.45)',
                      }}
                    >
                      {label}
                    </dt>
                    <dd
                      className="absolute font-sans font-light uppercase"
                      style={{
                        left: `${TEXT.statsList.valueX}px`,
                        fontSize: sheetFont(TEXT.statsList.size),
                        letterSpacing: `${TEXT.statsList.tracking}em`,
                        color: TEXT_WHITE,
                        textShadow: '0 0 10px rgba(255,255,255,0.25)',
                        transform: 'translateX(-100%)',
                      }}
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Onderbalk — beschikbaar links, acties rechts */}
            <div
              className="absolute inset-x-0 z-30"
              style={{
                top: BOTTOM.top,
                height: BASE_H - BOTTOM.top,
                background:
                  'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)',
              }}
            >
              <p
                className="absolute whitespace-nowrap font-sans font-normal uppercase leading-none"
                style={{
                  left: availLeft,
                  top: availTitleY - BOTTOM.top,
                  fontSize: sheetFont(BOTTOM.availTitle.size),
                  letterSpacing: `${BOTTOM.availTitle.tracking}em`,
                  color: COPPER_DIM,
                }}
              >
                Beschikbaar voor
              </p>
              <p
                className="absolute font-sans font-light uppercase leading-snug"
                style={{
                  left: availLeft,
                  top: availListY - BOTTOM.top,
                  right: 420,
                  fontSize: sheetFont(BOTTOM.availList.size),
                  letterSpacing: `${BOTTOM.availList.tracking}em`,
                  color: TEXT_WHITE,
                }}
              >
                {availInline}
              </p>

              <div
                className="absolute flex items-center gap-2"
                style={{
                  right: BOTTOM.actionsPadRight,
                  bottom: 28,
                }}
              >
                <Link
                  href={`${(process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')}/portal/model/gallery-3d?model=${active.id}`}
                  onClick={() => {
                    if (typeof sessionStorage !== 'undefined') {
                      sessionStorage.setItem(SHOWROOM_MODEL_SESSION_KEY, active.id);
                    }
                  }}
                  className="rounded border border-[#e8b88a]/35 bg-black/55 px-2.5 py-1 text-[11px] uppercase tracking-wider text-[#e8b88a]/90 backdrop-blur-sm hover:bg-black/75"
                >
                  Showroom
                </Link>
                {isAdmin && token ? (
                  <button
                    type="button"
                    className="rounded border border-white/15 bg-black/55 px-2.5 py-1 text-[11px] uppercase tracking-wider text-white/80 backdrop-blur-sm hover:bg-black/75"
                    onClick={() => {
                      void adminDownloadFile(
                        `/admin/set-card/users/${active.id}/preview.zip`,
                        token,
                        `setkaart-${ficheDisplayName(active, true).replace(/\s+/g, '-')}.zip`,
                      ).catch(() => window.alert('Setkaart download mislukt (concept moet compleet zijn).'));
                    }}
                  >
                    PDF
                  </button>
                ) : null}
                {onPrint ? (
                  <button
                    type="button"
                    className="rounded border border-white/15 bg-black/55 px-2.5 py-1 text-[11px] uppercase tracking-wider text-white/80 backdrop-blur-sm hover:bg-black/75"
                    onClick={() => onPrint(active, heroSrc)}
                    disabled={detailLoading || !heroSrc}
                  >
                    Afdrukken
                  </button>
                ) : null}
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/55 text-lg leading-none text-white/90 backdrop-blur-sm hover:bg-black/75"
                  onClick={onClose}
                  aria-label="Sluiten"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {detailErr ? (
          <p className="absolute bottom-[2%] left-[4%] z-[60] text-[10px] text-amber-300/90">{detailErr}</p>
        ) : null}

        {useShowcase && ready ? (
          <p className="pointer-events-none absolute left-4 top-4 z-[60] rounded-full border border-amber-400/30 bg-black/50 px-3 py-1 text-[10px] uppercase tracking-wider text-amber-200/80 backdrop-blur-sm">
            Demo-foto&apos;s — upload galerij voor dit model
          </p>
        ) : null}
      </div>
    </div>
  );
}
