'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

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

const pickBtnStyle = (on: boolean): CSSProperties => ({
  padding: '4px 8px',
  fontSize: 10,
  lineHeight: 1.2,
  letterSpacing: '0.03em',
  whiteSpace: 'nowrap',
  background: on ? 'var(--n-gold)' : 'transparent',
  color: on ? '#1a140c' : 'var(--n-ink)',
  borderColor: on ? 'var(--n-gold)' : 'rgba(201, 162, 74, 0.4)',
});

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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 4,
            flex: '1 1 auto',
            minWidth: 0,
          }}
        >
          {TRAILERS.map((t) => {
            const on = t.id === activeId;
            return (
              <button
                key={t.id}
                type="button"
                title={t.title}
                onClick={() => playTrailer(t.id)}
                className="nieuw-btn"
                style={pickBtnStyle(on)}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        {headerActions ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 6,
              flex: '0 1 auto',
            }}
          >
            {headerActions}
          </div>
        ) : null}
      </div>

      <p
        style={{
          margin: '14px 0 0',
          fontSize: 13,
          lineHeight: 1.55,
          color: 'var(--n-mut)',
        }}
      >
        Klik op knop Trailer 1, 2, 3 enz. om deze try-out trailers af te spelen op het scherm.
      </p>

      <p
        style={{
          margin: '10px 0 0',
          fontSize: 13,
          lineHeight: 1.5,
          color: 'var(--n-ink)',
        }}
      >
        {active ? (
          <>
            Nu op het scherm:{' '}
            <strong style={{ color: 'var(--n-gold)', fontWeight: 600 }}>{active.title}</strong>
          </>
        ) : (
          <span style={{ color: 'var(--n-mut)' }}>Nog geen trailer geselecteerd.</span>
        )}
      </p>

      <div
        className="nieuw-panel"
        style={{
          padding: 0,
          overflow: 'hidden',
          marginTop: 22,
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
                style={{
                  position: 'absolute',
                  right: 8,
                  bottom: 8,
                  zIndex: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '6px 10px',
                  borderRadius: 3,
                  border: '1px solid rgba(201, 162, 74, 0.55)',
                  background: 'rgba(10, 10, 14, 0.82)',
                  color: '#f3eee6',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  lineHeight: 1.2,
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
