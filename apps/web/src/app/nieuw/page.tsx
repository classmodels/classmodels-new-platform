'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { NieuwShell } from '@/components/nieuw/NieuwShell';

const LOGO = '/videos/logo-intro.mp4';

export default function NieuwHomePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<'intro' | 'portals'>('intro');
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const p = v.play();
    if (p) p.catch(() => setPhase('portals'));
  }, []);

  const goPortals = () => {
    setFading(true);
    window.setTimeout(() => {
      videoRef.current?.pause();
      setPhase('portals');
      setFading(false);
    }, 500);
  };

  return (
    <NieuwShell portal="home" hidePortalNav={phase === 'intro'}>
      {phase === 'intro' ? (
        <section style={{ position: 'relative', minHeight: '78vh', background: '#000' }}>
          <video
            ref={videoRef}
            src={LOGO}
            muted
            playsInline
            autoPlay
            onEnded={goPortals}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              width: '100%',
              height: '78vh',
              objectFit: 'contain',
              background: '#000',
              opacity: fading ? 0 : 1,
              transition: 'opacity 500ms ease',
            }}
          />
          <button
            type="button"
            onClick={goPortals}
            className="nieuw-btn nieuw-btn-ghost"
            style={{
              position: 'absolute',
              right: 24,
              bottom: 24,
              zIndex: 2,
              background: 'rgba(13,13,17,0.75)',
            }}
          >
            Overslaan ≫
          </button>
        </section>
      ) : (
        <section className="nieuw-sectie" style={{ paddingTop: 48, paddingBottom: 80 }}>
          <div className="nieuw-wrap">
            <h1 className="nieuw-h1" style={{ maxWidth: '16ch' }}>
              Kies uw <em>portaal</em>
            </h1>
            <p className="nieuw-lead" style={{ marginTop: 18, maxWidth: '62ch' }}>
              Welkom bij Class-Models. Elke bezoeker heeft een eigen omgeving: wie model wil worden,
              wie al model is, en wie als bedrijf modellen zoekt.
            </p>

            <div className="nieuw-grid-3" style={{ marginTop: 40 }}>
              <article className="nieuw-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/nieuw/gastenportaal.jpg" alt="Gastenportaal" />
                <div className="nieuw-card-body">
                  <h3>Gastenportaal</h3>
                  <p>
                    Voor iedereen die model wil worden. Plan een gratis testshoot, een
                    intakegesprek of schrijf je in voor een casting. Wij zoeken echte mensen met
                    uitstraling — ervaring is niet nodig. Een warme start én een bron van mooie
                    bijverdiensten.
                  </p>
                  <Link className="nieuw-btn" href="/nieuw/gasten/model-worden">
                    Naar gastenportaal →
                  </Link>
                </div>
              </article>

              <article className="nieuw-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/nieuw/modellenportaal.jpg" alt="Modellenportaal" />
                <div className="nieuw-card-body">
                  <h3>Modellenportaal</h3>
                  <p>
                    Exclusief voor modellen onder contract bij Class-Models. Beheer hier je
                    account, je profiel en je afspraken, en communiceer rechtstreeks met het
                    bureau — overzichtelijk, veilig en altijd binnen handbereik.
                  </p>
                  <Link className="nieuw-btn" href="/nieuw/modellen">
                    Naar modellenportaal →
                  </Link>
                </div>
              </article>

              <article className="nieuw-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/nieuw/klantenportaal.jpg" alt="Klantenportaal" />
                <div className="nieuw-card-body">
                  <h3>Klantenportaal</h3>
                  <p>
                    Voor merken en bedrijven die modellen zoeken voor campagnes, events of
                    producties. Dit portaal is momenteel in opbouw.
                  </p>
                  <Link className="nieuw-btn nieuw-btn-ghost" href="/nieuw/klanten">
                    Bekijk status →
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </section>
      )}
    </NieuwShell>
  );
}
