'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { Quad } from '@/components/model-portal/model-gallery-3d/quadTransform';
import { offsetQuad, quadMatrix3d } from '@/components/model-portal/model-gallery-3d/quadTransform';

const COPPER = '#c5a07d';
const DEPTH_SIDE = '#5c4228';

function insetBox(depth: number, frame: number): Pick<CSSProperties, 'top' | 'right' | 'bottom' | 'left'> {
  const total = depth + frame;
  if (total <= 0) return { top: 0, right: 0, bottom: 0, left: 0 };
  return { top: total, right: total, bottom: total, left: total };
}

/** Donkere zijkant van het kader — lijkt op dikte tegen de muur. */
function FrameDepthSides({ depthPx, depthColor }: { depthPx: number; depthColor: string }) {
  return (
    <>
      <span aria-hidden style={{ position: 'absolute', inset: 0, background: depthColor, pointerEvents: 'none' }} />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: depthPx * 1.35,
          background: 'linear-gradient(to top, rgba(0,0,0,0.58), transparent)',
          pointerEvents: 'none',
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: depthPx * 1.45,
          background: 'linear-gradient(to left, rgba(0,0,0,0.52), transparent)',
          pointerEvents: 'none',
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: Math.max(2, depthPx * 0.35),
          background: 'linear-gradient(to bottom, rgba(255,235,205,0.18), transparent)',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}

/** Licht/donker op kaderfront — 3D-profiel. */
function FrameBevel({ depthPx, framePx }: { depthPx: number; framePx: number }) {
  const hTop = Math.max(2, framePx * 0.55);
  const hBot = Math.max(2, framePx * 0.8);
  const wLeft = Math.max(2, framePx * 0.45);
  const wRight = Math.max(2, framePx * 0.7);

  return (
    <>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: depthPx,
          left: depthPx,
          right: depthPx,
          height: hTop,
          background: 'linear-gradient(to bottom, rgba(255,228,190,0.58), transparent)',
          pointerEvents: 'none',
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          bottom: depthPx,
          left: depthPx,
          right: depthPx,
          height: hBot,
          background: 'linear-gradient(to top, rgba(0,0,0,0.52), transparent)',
          pointerEvents: 'none',
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: depthPx,
          bottom: depthPx,
          left: depthPx,
          width: wLeft,
          background: 'linear-gradient(to right, rgba(255,228,190,0.38), transparent)',
          pointerEvents: 'none',
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: depthPx,
          bottom: depthPx,
          right: depthPx,
          width: wRight,
          background: 'linear-gradient(to left, rgba(0,0,0,0.45), transparent)',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}

function PinShell({
  matrix,
  srcW,
  srcH,
  active,
  onClick,
  onMouseEnter,
  onMouseLeave,
  showShadow,
  frameDepthPx,
  quad,
  children,
}: {
  matrix: string;
  srcW: number;
  srcH: number;
  active?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  showShadow: boolean;
  frameDepthPx: number;
  quad: Quad;
  children: ReactNode;
}) {
  const hasDepth = frameDepthPx > 0;
  const dropShadow = showShadow
    ? hasDepth
      ? '1px 3px 0 rgba(0,0,0,0.28), 4px 10px 18px rgba(0,0,0,0.48)'
      : '0 4px 14px rgba(0,0,0,0.45)'
    : 'none';

  const wallShadow =
    showShadow && hasDepth ? (
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: srcW,
          height: srcH,
          transformOrigin: '0 0',
          transform: quadMatrix3d(srcW, srcH, offsetQuad(quad, 4, 7)),
          background: 'rgba(0,0,0,0.32)',
          pointerEvents: 'none',
        }}
      />
    ) : null;

  return (
    <>
      {wallShadow}
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onMouseEnter}
        onBlur={onMouseLeave}
        className={`absolute overflow-hidden border-0 p-0 outline-none ${active ? 'brightness-110' : 'hover:brightness-105'}`}
        style={{
          left: 0,
          top: 0,
          width: srcW,
          height: srcH,
          position: 'absolute',
          transformOrigin: '0 0',
          transform: matrix,
          background: 'transparent',
          boxShadow: dropShadow,
        }}
        aria-label="Galerijfoto"
      >
        {children}
      </button>
    </>
  );
}

export function QuadPhotoPin({
  src,
  quad,
  srcW,
  srcH,
  active,
  onClick,
  framePx = 1.2,
  frameColor = COPPER,
  frameDepthPx = 0,
  frameDepthColor = DEPTH_SIDE,
  showShadow = true,
  imageScale = 1,
  tone = 'gallery',
  fit = 'cover',
  onMouseEnter,
  onMouseLeave,
  objectPosition = 'center center',
}: {
  src: string;
  quad: Quad;
  srcW: number;
  srcH: number;
  active?: boolean;
  onClick?: () => void;
  framePx?: number;
  frameColor?: string;
  /** Zichtbare kaderdikte tegen de muur (px in bronrechthoek). */
  frameDepthPx?: number;
  frameDepthColor?: string;
  showShadow?: boolean;
  imageScale?: number;
  tone?: 'gallery' | 'natural';
  fit?: 'cover' | 'fill' | 'cover-full' | 'cover-width';
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  objectPosition?: string;
}) {
  const matrix = quadMatrix3d(srcW, srcH, quad);
  const hasFrame = framePx > 0;
  const hasDepth = frameDepthPx > 0;
  const photoInset = insetBox(hasDepth ? frameDepthPx : 0, hasFrame ? framePx : 0);
  const legacyInset = hasFrame && !hasDepth ? framePx : 0;

  const toneFilter =
    tone === 'natural'
      ? undefined
      : 'grayscale(1) contrast(1.06) brightness(0.94)';

  const frameLayers = (
    <>
      {hasDepth ? <FrameDepthSides depthPx={frameDepthPx} depthColor={frameDepthColor} /> : null}
      {hasFrame ? (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: hasDepth ? frameDepthPx : 0,
            right: hasDepth ? frameDepthPx : 0,
            bottom: hasDepth ? frameDepthPx : 0,
            left: hasDepth ? frameDepthPx : 0,
            background: frameColor,
            pointerEvents: 'none',
          }}
        />
      ) : !hasDepth ? (
        <span aria-hidden style={{ position: 'absolute', inset: 0, background: frameColor, pointerEvents: 'none' }} />
      ) : null}
      {hasFrame ? <FrameBevel depthPx={hasDepth ? frameDepthPx : 0} framePx={framePx} /> : null}
    </>
  );

  const shellProps = {
    matrix,
    srcW,
    srcH,
    active,
    onClick,
    onMouseEnter,
    onMouseLeave,
    showShadow,
    frameDepthPx,
    quad,
  };

  /** fill = exacte dekking wit vlak, geen zwarte zijranden */
  if (fit === 'fill') {
    const bgPos = objectPosition.replace('center', 'center').replace('top', 'top');
    const bgStyle: CSSProperties = {
      position: 'absolute',
      ...photoInset,
      backgroundImage: `url(${src})`,
      backgroundSize: imageScale === 1 ? '100% 100%' : `${imageScale * 100}% ${imageScale * 100}%`,
      backgroundPosition: bgPos,
      backgroundRepeat: 'no-repeat',
      filter: toneFilter,
      pointerEvents: 'none',
    };

    if (!hasDepth && hasFrame) {
      return (
        <PinShell {...shellProps}>
          <span aria-hidden style={{ position: 'absolute', inset: 0, background: frameColor, pointerEvents: 'none' }} />
          <span aria-hidden style={{ ...bgStyle, top: legacyInset, right: legacyInset, bottom: legacyInset, left: legacyInset }} />
        </PinShell>
      );
    }

    return (
      <PinShell {...shellProps}>
        {frameLayers}
        <span aria-hidden style={bgStyle} />
      </PinShell>
    );
  }

  const toneClass =
    tone === 'natural' ? '' : 'grayscale contrast-[1.06] brightness-[0.94]';

  const imgClass =
    fit === 'cover-full'
      ? `absolute inset-0 block h-full w-full object-cover ${toneClass}`
      : tone === 'natural'
        ? 'absolute inset-0 block h-full w-full object-cover object-center'
        : `absolute inset-0 block h-full w-full object-cover object-top ${toneClass}`;

  let imgStyle: CSSProperties = { objectPosition };

  if (fit === 'cover-width') {
    const wPct = imageScale * 100;
    imgStyle = {
      position: 'absolute',
      width: `${wPct}%`,
      height: 'auto',
      minHeight: '100%',
      objectFit: 'cover',
      objectPosition,
      left: `${((1 - imageScale) / 2) * 100}%`,
      top: 0,
      maxWidth: 'none',
    };
  } else if (fit === 'cover-full') {
    imgStyle =
      imageScale !== 1
        ? {
            position: 'absolute',
            width: `${imageScale * 100}%`,
            height: `${imageScale * 100}%`,
            maxWidth: 'none',
            left: `${((1 - imageScale) / 2) * 100}%`,
            top: `${((1 - imageScale) / 2) * 100}%`,
            objectPosition,
          }
        : { inset: 0, objectPosition };
  } else if (imageScale !== 1) {
    imgStyle = {
      width: `${imageScale * 100}%`,
      height: `${imageScale * 100}%`,
      maxWidth: 'none',
      marginLeft: `${((1 - imageScale) / 2) * 100}%`,
      marginTop: `${((1 - imageScale) / 2) * 100}%`,
      objectPosition,
    };
  }

  if (!hasDepth && hasFrame) {
    return (
      <PinShell {...shellProps}>
        <span aria-hidden style={{ position: 'absolute', inset: 0, background: frameColor, pointerEvents: 'none' }} />
        <span
          style={{
            position: 'absolute',
            top: legacyInset,
            right: legacyInset,
            bottom: legacyInset,
            left: legacyInset,
            overflow: 'hidden',
            display: 'block',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className={imgClass} style={imgStyle} draggable={false} />
        </span>
      </PinShell>
    );
  }

  return (
    <PinShell {...shellProps}>
      {frameLayers}
      <span
        style={{
          position: 'absolute',
          ...photoInset,
          overflow: 'hidden',
          display: 'block',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className={imgClass} style={imgStyle} draggable={false} />
      </span>
    </PinShell>
  );
}
