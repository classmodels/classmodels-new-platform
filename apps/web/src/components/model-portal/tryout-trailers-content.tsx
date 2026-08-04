'use client';

const TRAILERS = [
  {
    id: 'try-out',
    title: 'Try-out Modeshow',
    subtitle: 'Sfeerimpressie van de try-out',
    src: '/nieuw/trailers/try-out-modeshow.mp4',
  },
  {
    id: '29-maart-2025',
    title: 'Modeshow 29 maart 2025',
    subtitle: 'Highlights van de modeshow',
    src: '/nieuw/trailers/modeshow-29-maart-2025.mp4',
  },
  {
    id: 'modeshow-trailer',
    title: 'Modeshow trailer',
    subtitle: 'Officiële trailer',
    src: '/nieuw/trailers/modeshow-trailer-sd.mp4',
  },
  {
    id: 'trailer-modeshow',
    title: 'Trailer modeshow',
    subtitle: 'Extra sfeerbeelden',
    src: '/nieuw/trailers/trailer-modeshow-sd.mp4',
  },
  {
    id: '30-sept-2023',
    title: 'Modeshow 30 september 2023',
    subtitle: 'Archieftrailer',
    src: '/nieuw/trailers/modeshow-30-september-2023.mp4',
  },
] as const;

export function TryoutTrailersContent() {
  return (
    <div
      style={{
        position: 'relative',
        margin: '0 -4px',
        padding: '8px 4px 28px',
        borderRadius: 6,
        background:
          'radial-gradient(ellipse 90% 55% at 50% -10%, rgba(201, 162, 74, 0.22), transparent 55%), linear-gradient(180deg, #0c0c10 0%, #121218 45%, #0a0a0d 100%)',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(201,162,74,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,162,74,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.55), transparent 85%)',
          pointerEvents: 'none',
        }}
      />

      <header style={{ position: 'relative', textAlign: 'center', padding: '20px 12px 28px' }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(201, 162, 74, 0.85)',
          }}
        >
          Class-Models
        </p>
        <h2
          style={{
            margin: '10px 0 0',
            fontFamily: 'var(--n-serif)',
            fontSize: 'clamp(26px, 4vw, 40px)',
            fontWeight: 600,
            letterSpacing: '0.02em',
            color: '#f3eee6',
            lineHeight: 1.15,
          }}
        >
          Trailers
        </h2>
        <div
          style={{
            width: 56,
            height: 2,
            margin: '14px auto 0',
            background: 'linear-gradient(90deg, transparent, #c9a24a, transparent)',
          }}
        />
        <p
          style={{
            margin: '14px auto 0',
            maxWidth: 420,
            fontSize: 14,
            lineHeight: 1.55,
            color: 'rgba(243, 238, 230, 0.62)',
          }}
        >
          Duik in de sfeer van onze modeshows — alle trailers op één plek.
        </p>
      </header>

      <div
        style={{
          position: 'relative',
          display: 'grid',
          gap: 28,
          maxWidth: 880,
          margin: '0 auto',
          padding: '0 8px',
        }}
      >
        {TRAILERS.map((t, i) => (
          <article
            key={t.id}
            style={{
              border: '1px solid rgba(201, 162, 74, 0.28)',
              background: 'rgba(10, 10, 14, 0.72)',
              boxShadow: '0 18px 48px rgba(0,0,0,0.45)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 12,
                padding: '14px 16px 12px',
                borderBottom: '1px solid rgba(201, 162, 74, 0.18)',
                background: 'linear-gradient(90deg, rgba(201,162,74,0.12), transparent 70%)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'rgba(201, 162, 74, 0.75)',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h3
                  style={{
                    margin: '4px 0 0',
                    fontFamily: 'var(--n-serif)',
                    fontSize: 'clamp(18px, 2.4vw, 22px)',
                    fontWeight: 600,
                    color: '#f3eee6',
                    lineHeight: 1.25,
                  }}
                >
                  {t.title}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(243, 238, 230, 0.5)' }}>
                  {t.subtitle}
                </p>
              </div>
            </div>
            <div style={{ background: '#000', aspectRatio: '16 / 9' }}>
              <video
                controls
                playsInline
                preload="metadata"
                src={t.src}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  background: '#000',
                }}
              >
                Uw browser ondersteunt geen video.
              </video>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
