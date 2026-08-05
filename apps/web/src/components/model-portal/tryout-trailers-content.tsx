'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

const TRAILERS = [
  {
    id: 'try-out',
    label: 'Trailer 1',
    title: 'Try-out Modeshow',
    src: '/nieuw/trailers/try-out-modeshow.mp4',
  },
  {
    id: '29-maart-2025',
    label: 'Trailer 2',
    title: 'Modeshow 29 maart 2025',
    src: '/nieuw/trailers/modeshow-29-maart-2025.mp4',
  },
  {
    id: 'modeshow-trailer',
    label: 'Trailer 3',
    title: 'Modeshow trailer',
    src: '/nieuw/trailers/modeshow-trailer-sd.mp4',
  },
  {
    id: 'trailer-modeshow',
    label: 'Trailer 4',
    title: 'Trailer modeshow',
    src: '/nieuw/trailers/trailer-modeshow-sd.mp4',
  },
  {
    id: '30-sept-2023',
    label: 'Trailer 5',
    title: 'Modeshow 30 september 2023',
    src: '/nieuw/trailers/modeshow-30-september-2023.mp4',
  },
] as const;

/** Exact schermvlak in bioscoop.jpg (1920×1080). */
const SCREEN = {
  left: '20.57%',
  top: '3.7%',
  width: '59.07%',
  height: '57.41%',
} as const;

export function TryoutTrailersContent({ headerActions }: { headerActions?: ReactNode }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);

  const active = TRAILERS.find((t) => t.id === activeId) ?? null;

  const playTrailer = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !active) return;
    el.muted = muted;
    const p = el.play();
    if (p) void p.catch(() => undefined);
    // muted intentionally omitted — toggling mute must not restart the film
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.muted = muted;
  }, [muted]);

  return (
    <div>
      <div className="nieuw-trailer-toolbar">
        <div className="cm-kp-actions">
          {TRAILERS.map((t) => {
            const on = t.id === activeId;
            return (
              <button
                key={t.id}
                type="button"
                title={t.title}
                onClick={() => playTrailer(t.id)}
                className={on ? 'nieuw-btn' : 'nieuw-btn nieuw-btn-ghost'}
                aria-pressed={on}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        {headerActions ? headerActions : null}
      </div>

      <p className="nieuw-trailer-hint">
        {active ? (
          <>
            Nu op het scherm:{' '}
            <strong style={{ color: 'var(--n-gold)', fontWeight: 600 }}>{active.title}</strong>
          </>
        ) : (
          <span>Selecteer een trailer om af te spelen</span>
        )}
      </p>

      <div
        className="nieuw-panel"
        style={{
          padding: 0,
          overflow: 'hidden',
          marginTop: 32,
          marginLeft: -4,
          marginRight: -4,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            lineHeight: 0,
            background: '#050505',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/nieuw/trailers/bioscoop.jpg"
            alt="Bioscoopzaal"
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
            draggable={false}
          />

          <div
            style={{
              position: 'absolute',
              left: SCREEN.left,
              top: SCREEN.top,
              width: SCREEN.width,
              height: SCREEN.height,
              background: '#050505',
              overflow: 'hidden',
            }}
          >
            {active ? (
              <video
                key={active.id}
                ref={videoRef}
                src={active.src}
                playsInline
                muted={muted}
                autoPlay
                controls={false}
                disablePictureInPicture
                controlsList="nodownload noplaybackrate noremoteplayback"
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  background: '#000',
                  pointerEvents: 'none',
                }}
              />
            ) : null}

            {active ? (
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? 'Geluid aanzetten' : 'Geluid uitzetten'}
                title={muted ? 'Geluid aanzetten' : 'Geluid uitzetten'}
                className="nieuw-btn nieuw-btn-ghost"
                style={{
                  position: 'absolute',
                  right: 8,
                  bottom: 8,
                  zIndex: 2,
                  pointerEvents: 'auto',
                }}
              >
                {muted ? 'Geluid uit' : 'Geluid aan'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
