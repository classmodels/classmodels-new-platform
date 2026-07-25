'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import './nieuw.css';

export type NieuwPortal = 'home' | 'gasten' | 'modellen' | 'klanten';

const GASTEN_NAV = [
  { href: '/nieuw/gasten/model-worden', label: 'Model worden' },
  { href: '/nieuw/gasten/gratis-fotoshoot', label: 'Gratis fotoshoot' },
  { href: '/nieuw/gasten/casting', label: 'Casting' },
  { href: '/nieuw/gasten/intake', label: 'Intake gesprek' },
] as const;

const MODELLEN_NAV = [
  { href: '/nieuw/modellen', label: 'Home' },
  { href: '/nieuw/modellen?tab=opdrachten', label: 'Opdrachten' },
  { href: '/nieuw/modellen?tab=profiel', label: 'Mijn profiel' },
  { href: '/nieuw/modellen?tab=portfolio', label: 'Portfolio afspraak' },
  { href: '/nieuw/modellen?tab=opleiding', label: 'Opleiding' },
  { href: '/nieuw/modellen?tab=setkaarten', label: 'Setkaarten' },
  { href: '/nieuw/modellen?tab=tryout-modeshow', label: 'Try-out modeshow' },
  { href: '/nieuw/modellen?tab=modeshow-28', label: 'Download try-out' },
  { href: '/nieuw/modellen?tab=modellen', label: 'Modellen' },
  { href: '/nieuw/modellen?tab=premium', label: 'Premium' },
  { href: '/nieuw/modellen?tab=historiek', label: 'Historiek' },
  { href: '/nieuw/modellen?tab=push', label: 'Pushberichten' },
  { href: '/nieuw/modellen?tab=bericht', label: 'Bericht sturen' },
  { href: '/nieuw/modellen?tab=review-schrijven', label: 'Review' },
] as const;

function portalFromPath(pathname: string | null): NieuwPortal {
  if (!pathname) return 'home';
  if (pathname.startsWith('/nieuw/gasten')) return 'gasten';
  if (pathname.startsWith('/nieuw/modellen')) return 'modellen';
  if (pathname.startsWith('/nieuw/klanten')) return 'klanten';
  return 'home';
}

function isActive(href: string, pathname: string | null, search: string) {
  if (!pathname) return false;
  if (href.includes('?')) {
    const [path, q] = href.split('?');
    return pathname === path && search.includes(q);
  }
  if (href === '/nieuw/modellen') {
    return pathname === href && !search.includes('tab=');
  }
  if (href === '/nieuw/gasten/model-worden') {
    return pathname === href || pathname === '/nieuw/gasten';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NieuwShell({
  children,
  portal,
  hidePortalNav = false,
}: {
  children: ReactNode;
  portal?: NieuwPortal;
  hidePortalNav?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, loading } = useAuth();
  const activePortal = portal ?? portalFromPath(pathname);
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : '';

  const subNav =
    activePortal === 'gasten' ? GASTEN_NAV : activePortal === 'modellen' ? MODELLEN_NAV : null;

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email || '';

  function goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/nieuw');
  }

  return (
    <div className="nieuw-root">
      <header className="nieuw-kop">
        <div className="nieuw-kop-inner">
          <Link className="nieuw-merk" href="/nieuw">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="nieuw-merk-logo"
              src="/nieuw/logo.png"
              alt="Class-Models — Modeling Agency"
            />
          </Link>

          {!hidePortalNav ? (
            <nav className="nieuw-kop-pillars" aria-label="Portalen">
              <Link
                href="/nieuw/gasten/model-worden"
                className={`nieuw-pillar${activePortal === 'gasten' ? ' actief' : ''}`}
              >
                <span>Gastenportaal · model worden</span>
              </Link>
              <Link
                href="/nieuw/modellen"
                className={`nieuw-pillar${activePortal === 'modellen' ? ' actief' : ''}`}
              >
                <span>Modellenportaal</span>
              </Link>
              <Link
                href="/nieuw/klanten"
                className={`nieuw-pillar${activePortal === 'klanten' ? ' actief' : ''}`}
              >
                <span>Klantenportaal</span>
              </Link>
            </nav>
          ) : (
            <span className="nieuw-kop-pillars-spacer" aria-hidden="true" />
          )}

          <nav className="nieuw-kop-actions" aria-label="Snelle acties">
            <Link href="/nieuw/reviews">Reviews</Link>
            <Link href="/nieuw/gasten/contact">Contact</Link>
            {!loading && user ? (
              <button type="button" className="nieuw-back-btn" onClick={() => logout()}>
                Uitloggen
              </button>
            ) : !loading ? (
              <Link href="/nieuw/modellen" className="nieuw-back-btn">
                Inloggen
              </Link>
            ) : null}
            <button type="button" className="nieuw-back-btn" onClick={goBack}>
              Back
            </button>
          </nav>
        </div>
      </header>

      {subNav && activePortal !== 'home' ? (
        <div className="nieuw-subnav-outer">
          <div className="nieuw-wrap">
            {activePortal === 'modellen' && user ? (
              <p className="nieuw-welcome">
                Welkom{displayName ? `, ${displayName}` : ''}
              </p>
            ) : null}
            <nav className="nieuw-subnav" aria-label="Portaalmenu">
              {subNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActive(item.href, pathname, search) ? 'actief' : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      ) : null}

      <main>{children}</main>

      <footer className="nieuw-footer">
        <div className="nieuw-wrap">
          <div className="nieuw-footer-grid">
            <div>
              <Link className="nieuw-merk" href="/nieuw">
                <span className="nieuw-merk-naam">
                  Class<b>-</b>Models
                </span>
                <span className="nieuw-merk-sub">Modeling Agency</span>
              </Link>
              <p style={{ marginTop: 14, maxWidth: '36ch' }}>
                Meer dan 20 jaar het modellenbureau waar persoonlijkheid het verschil maakt.
              </p>
            </div>
            <div>
              <h5>Gastenportaal</h5>
              <p>
                <Link href="/nieuw/gasten/model-worden">Model worden</Link>
                <br />
                <Link href="/nieuw/gasten/gratis-fotoshoot">Gratis fotoshoot</Link>
                <br />
                <Link href="/nieuw/gasten/casting">Casting</Link>
                <br />
                <Link href="/nieuw/gasten/intake">Intake gesprek</Link>
              </p>
            </div>
            <div>
              <h5>Portalen</h5>
              <p>
                <Link href="/nieuw/modellen">Modellenportaal</Link>
                <br />
                <Link href="/nieuw/klanten">Klantenportaal</Link>
                <br />
                <Link href="/nieuw/reviews">Reviews</Link>
                <br />
                <Link href="/?classic=1">Klassieke site</Link>
              </p>
            </div>
            <div>
              <h5>Contact</h5>
              <p>
                Provinciebaan 3, 2235 Hulshout
                <br />
                <a href="mailto:info@class-models.be">info@class-models.be</a>
                <br />
                <a href="tel:+32485322307">0032 (0) 485 322 307</a>
              </p>
            </div>
          </div>
          <div className="nieuw-footer-bottom">
            <span>© Class-Models — Modeling Agency</span>
            <span>class-models.be</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
