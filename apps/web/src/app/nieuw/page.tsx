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
        <>
          <section className="nieuw-sectie" style={{ paddingTop: 72 }}>
            <div className="nieuw-wrap">
              <span className="nieuw-label">Class-Models · Modeling Agency</span>
              <h1 className="nieuw-h1" style={{ marginTop: 18, maxWidth: '16ch' }}>
                Kies uw <em>portaal</em>
              </h1>
              <p className="nieuw-lead" style={{ marginTop: 18, maxWidth: '62ch' }}>
                Welkom bij Class-Models. Elke bezoeker heeft een eigen omgeving: wie model wil
                worden, wie al model is, en wie als bedrijf modellen zoekt. Kies hieronder het
                portaal dat bij u past.
              </p>
            </div>
          </section>

          <section style={{ paddingBottom: 80 }}>
            <div className="nieuw-wrap">
              <div className="nieuw-grid-3">
                <article className="nieuw-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/nieuw/hal.jpg" alt="Gastenportaal" />
                  <div className="nieuw-card-body">
                    <span className="nieuw-label">01 · Open voor iedereen</span>
                    <h3>Gastenportaal</h3>
                    <p>
                      Voor wie model wil worden. Informatie, gratis fotoshoot, casting en intake —
                      met online afspraak in onze agenda als belangrijkste stap.
                    </p>
                    <Link className="nieuw-btn" href="/nieuw/gasten/model-worden">
                      Naar gastenportaal →
                    </Link>
                  </div>
                </article>

                <article className="nieuw-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/nieuw/fotoshoot.jpg" alt="Modellenportaal" />
                  <div className="nieuw-card-body">
                    <span className="nieuw-label">02 · Alleen voor modellen</span>
                    <h3>Modellenportaal</h3>
                    <p>
                      Voor onze modellen. Profiel, opdrachten, portfolio, setkaarten, try-outs en
                      meer — na inloggen in een eigen, overzichtelijke omgeving.
                    </p>
                    <Link className="nieuw-btn" href="/nieuw/modellen">
                      Inloggen als model →
                    </Link>
                  </div>
                </article>

                <article className="nieuw-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/nieuw/intake.jpg" alt="Klantenportaal" />
                  <div className="nieuw-card-body">
                    <span className="nieuw-label">03 · Voor bedrijven</span>
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
        </>
      )}
    </NieuwShell>
  );
}
