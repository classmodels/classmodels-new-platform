'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { MobileClientAppShell } from '@/components/MobileClientAppShell';
import { MobileGuestAppShell } from '@/components/MobileGuestAppShell';
import { MobileModelAppShell } from '@/components/MobileModelAppShell';
import { useIsMobile } from '@/lib/use-is-mobile';
import './nieuw.css';

export type NieuwPortal = 'home' | 'gasten' | 'modellen' | 'klanten';

const GASTEN_NAV = [
  { href: '/gasten/model-worden', label: 'Model worden' },
  { href: '/gasten/gratis-fotoshoot', label: 'Gratis testshoot' },
  { href: '/gasten/testshoot', label: 'Testshoot-foto’s' },
  { href: '/gasten/casting', label: 'Casting' },
  { href: '/gasten/intake', label: 'Intake-gesprek' },
  { href: '/gasten/faq', label: 'FAQ' },
] as const;

const MODELLEN_NAV = [
  { href: '/modellen', label: 'Home' },
  { href: '/modellen?tab=opdrachten', label: 'Opdrachten' },
  { href: '/modellen?tab=profiel', label: 'Mijn profiel' },
  { href: '/modellen?tab=portfolio', label: 'Portfolio afspraak' },
  { href: '/modellen?tab=opleiding', label: 'Opleiding' },
  { href: '/modellen?tab=setkaarten', label: 'Setkaarten' },
  { href: '/modellen?tab=tryout-modeshow', label: 'Try-out modeshow' },
  { href: '/modellen?tab=modellen', label: 'Modellen' },
  { href: '/modellen?tab=historiek', label: 'Historiek' },
  { href: '/modellen?tab=push', label: 'Pushberichten' },
  { href: '/modellen?tab=bericht', label: 'Bericht sturen' },
] as const;

const KLANTEN_NAV = [
  { href: '/klanten', label: 'Waar staat Class-Models voor?' },
  { href: '/klanten?tab=wat-bieden', label: 'Wat bieden we aan' },
  { href: '/klanten?tab=modellen-boeken', label: 'Modellen boeken / tarieven' },
  { href: '/klanten?tab=event', label: 'Een event organiseren?' },
  { href: '/klanten?tab=modellen', label: 'Modellen' },
  { href: '/klanten?tab=gekozen', label: 'Gekozen' },
  { href: '/klanten?tab=aanvraag', label: 'Casting aanvragen' },
  { href: '/klanten?tab=aanvragen', label: 'Mijn aanvragen' },
] as const;

const BOOKING_PATHS = [
  '/gasten/gratis-fotoshoot',
  '/gasten/casting',
  '/gasten/intake',
] as const;

function portalFromPath(pathname: string | null): NieuwPortal {
  if (!pathname) return 'home';
  if (pathname.startsWith('/gasten')) return 'gasten';
  if (pathname.startsWith('/modellen')) return 'modellen';
  if (pathname.startsWith('/klanten')) return 'klanten';
  return 'home';
}

function isActive(href: string, pathname: string | null, search: string) {
  if (!pathname) return false;
  if (href.includes('?')) {
    const [path, q] = href.split('?');
    return pathname === path && search.includes(q);
  }
  if (href === '/modellen') {
    return pathname === href && !search.includes('tab=');
  }
  if (href === '/klanten') {
    return pathname === href && !search.includes('tab=');
  }
  if (href === '/gasten/model-worden') {
    return pathname === href || pathname === '/gasten';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isBookingPage(pathname: string | null) {
  if (!pathname) return false;
  return BOOKING_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
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
  const isMobile = useIsMobile();
  const activePortal = portal ?? portalFromPath(pathname);
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : '';
  const onBooking = isBookingPage(pathname);
  /** Op gsm: gasten/modellen/klanten in de app-shell (niet de desktop-header). */
  const appMobileGuest =
    isMobile === true &&
    Boolean(pathname?.startsWith('/gasten') || pathname === '/reviews' || pathname?.startsWith('/reviews/'));
  const appMobileModel = isMobile === true && Boolean(pathname?.startsWith('/modellen'));
  const appMobileClient = isMobile === true && Boolean(pathname?.startsWith('/klanten'));
  const appMobilePage = appMobileGuest || appMobileModel || appMobileClient;

  const isKlantUser = Boolean(
    user?.roles?.includes('client') ||
      user?.roles?.includes('admin') ||
      user?.permissions?.includes('*') ||
      user?.permissions?.some((p) => p.startsWith('admin.')),
  );

  const subNav =
    activePortal === 'gasten'
      ? GASTEN_NAV
      : activePortal === 'modellen'
        ? MODELLEN_NAV
        : activePortal === 'klanten' && isKlantUser
          ? KLANTEN_NAV
          : null;

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email || '';

  const loginHref = '/inloggen';

  function goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  }

  const cta =
    activePortal === 'modellen' ? (
      <Link href="/modellen?tab=premium" className="nieuw-cta-top">
        Word premium
      </Link>
    ) : onBooking ? (
      <Link href="#agenda" className="nieuw-cta-top">
        Afspraak maken
      </Link>
    ) : activePortal === 'klanten' ? (
      user ? (
        <Link href="/klanten?tab=aanvraag" className="nieuw-cta-top">
          Casting aanvragen
        </Link>
      ) : (
        <Link href="/inloggen" className="nieuw-cta-top">
          Inloggen
        </Link>
      )
    ) : (
      <Link href="/gasten/gratis-fotoshoot#agenda" className="nieuw-cta-top">
        Inschrijven
      </Link>
    );

  const chromeClass = appMobilePage ? ' nieuw-chrome-desktop' : '';

  const shellBody = (
    <div className={`nieuw-root${appMobilePage ? ' nieuw-root--app-mobile-page' : ''}`}>
      <header className={`nieuw-kop${chromeClass}`}>
        <div className="nieuw-kop-inner">
          <Link className="nieuw-merk" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="nieuw-merk-logo"
              src="/nieuw/logo-header.png"
              alt="Class-Models — Modeling Agency"
            />
          </Link>

          {!hidePortalNav ? (
            <nav className="nieuw-kop-pillars" aria-label="Portalen">
              <Link
                href="/gasten/model-worden"
                className={`nieuw-pillar${activePortal === 'gasten' ? ' actief' : ''}`}
              >
                <span>Gastenportaal · schrijf u in</span>
              </Link>
              <Link
                href="/modellen"
                className={`nieuw-pillar${activePortal === 'modellen' ? ' actief' : ''}`}
              >
                <span>Modellenportaal</span>
              </Link>
              <Link
                href="/klanten"
                className={`nieuw-pillar${activePortal === 'klanten' ? ' actief' : ''}`}
              >
                <span>Klantenportaal</span>
              </Link>
            </nav>
          ) : (
            <span className="nieuw-kop-pillars-spacer" aria-hidden="true" />
          )}

          <nav className="nieuw-kop-actions" aria-label="Account">
            {!loading && user ? (
              <button type="button" className="nieuw-back-btn" onClick={() => logout()}>
                Uitloggen
              </button>
            ) : !loading ? (
              <Link href={loginHref} className="nieuw-back-btn">
                Inloggen
              </Link>
            ) : null}
            <button type="button" className="nieuw-back-btn" onClick={goBack}>
              ← Back
            </button>
          </nav>
        </div>
      </header>

      <div className={`nieuw-util-bar${chromeClass}`}>
        <div className="nieuw-util-bar-inner">
          {subNav ? (
            <nav className="nieuw-util-nav" aria-label="Portaalmenu">
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
          ) : (
            <span className="nieuw-util-nav-spacer" aria-hidden="true" />
          )}
          <nav className="nieuw-util-actions" aria-label="Snelle acties">
            <Link href="/reviews">Reviews</Link>
            <Link href="/gasten/contact">Contact</Link>
            {cta}
          </nav>
        </div>
      </div>

      {activePortal === 'modellen' && user ? (
        <div className={`nieuw-wrap${chromeClass}`}>
          <p className="nieuw-welcome">Welkom{displayName ? `, ${displayName}` : ''}</p>
        </div>
      ) : activePortal === 'klanten' && user ? (
        <div className={`nieuw-wrap${chromeClass}`}>
          <p className="nieuw-welcome">Welkom{displayName ? `, ${displayName}` : ''}</p>
        </div>
      ) : null}

      <main className="nieuw-main">{children}</main>

      <footer className={`nieuw-footer${chromeClass}`}>
        <div className="nieuw-wrap">
          <div className="nieuw-footer-grid">
            <div>
              <Link className="nieuw-merk" href="/">
                <span className="nieuw-merk-naam">
                  Class<b>-</b>Models
                </span>
                <span className="nieuw-merk-sub">Modeling Agency</span>
              </Link>
              <p style={{ marginTop: 14, maxWidth: '36ch' }}>
                Professioneel modellenbureau in België — model worden, casting en boekingen.
              </p>
            </div>
            <div>
              <h5>Gastenportaal</h5>
              <p>
                <Link href="/gasten/model-worden">Model worden</Link>
                <br />
                <Link href="/gasten/gratis-fotoshoot">Gratis testshoot</Link>
                <br />
                <Link href="/gasten/casting">Casting</Link>
                <br />
                <Link href="/gasten/intake">Intake-gesprek</Link>
              </p>
            </div>
            <div>
              <h5>Portalen</h5>
              <p>
                <Link href="/gasten/model-worden">Gastenportaal</Link>
                <br />
                <Link href="/modellen">Modellenportaal</Link>
                <br />
                <Link href="/klanten">Klantenportaal</Link>
                <br />
                <Link href="/reviews">Reviews</Link>
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

  if (appMobileModel) {
    return <MobileModelAppShell>{shellBody}</MobileModelAppShell>;
  }

  if (appMobileClient) {
    return <MobileClientAppShell>{shellBody}</MobileClientAppShell>;
  }

  if (appMobileGuest) {
    const mobileTitle =
      pathname?.includes('gratis-fotoshoot')
        ? 'Gratis testshoot'
        : pathname?.includes('casting')
          ? 'Casting'
          : pathname?.includes('intake')
            ? 'Intake gesprek'
            : pathname?.includes('testshoot')
              ? 'Testshoot-foto’s'
              : pathname?.includes('contact')
                ? 'Contact'
                : pathname?.startsWith('/reviews')
                  ? 'Reviews'
                  : 'Gastenportaal';
    return (
      <MobileGuestAppShell title={mobileTitle} subtitle="Class-Models">
        {shellBody}
      </MobileGuestAppShell>
    );
  }

  return shellBody;
}
