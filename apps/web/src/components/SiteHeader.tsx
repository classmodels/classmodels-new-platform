'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { CmText } from '@/components/CmText';
import { GoogleTranslate } from '@/components/GoogleTranslate';
import { useIsMobile } from '@/lib/use-is-mobile';

export function SiteHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile() === true;
  const onAdmin = pathname?.startsWith('/admin');
  if (onAdmin) return null;

  const guestHref = '/';
  const modelHref = user ? '/modellen' : '/inloggen';
  const loginHref = '/inloggen';

  if (isMobile) {
    // Portaalpagina's hebben op de gsm hun eigen app-balk met Terug/Beginpagina.
    if (pathname?.startsWith('/portal') || pathname?.startsWith('/')) return null;
    // Overige gsm-pagina's: alleen '← Terug' (één stap terug) en 'Beginpagina'
    // (rechts) — geen taalknoppen, geen Inloggen, geen navigatielinks.
    // Vast bovenaan zodat de rij bij het scrollen zichtbaar blijft.
    return (
      <>
        <header className="fixed inset-x-0 top-0 z-30 border-b border-[#ddd5c7] bg-[#f1eee8]">
          <div className="flex items-center justify-between gap-2.5 px-4 py-2.5">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.history.length > 1) router.back();
                else router.push('/');
              }}
              className="rounded-full border border-[#c9bfae] bg-white px-4 py-1.5 text-[13px] font-semibold text-[#372c1f]"
              aria-label="Terug"
            >
              ← <CmText contentKey="site.header.nav.back" as="span" fallback="Terug" />
            </button>
            <Link
              href="/"
              className="rounded-full border border-[#372c1f] bg-[#372c1f] px-4 py-1.5 text-[13px] font-semibold text-[#f6efe2]"
            >
              Beginpagina
            </Link>
          </div>
        </header>
        {/* Opvulblok met dezelfde hoogte als de vaste rij hierboven. */}
        <div aria-hidden className="h-[54px] shrink-0" />
      </>
    );
  }

  return (
    <header className="shrink-0 border-b border-white/10 bg-ink text-white">
      {/* Fijne zwarte menubalk: back-knop + logo links, menuknoppen + talen rechts. */}
      <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-1.5 text-xs md:flex-nowrap md:gap-x-8 lg:px-[50px]">
        <div className="flex min-w-0 shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) router.back();
              else router.push('/');
            }}
            className="shrink-0 rounded-full border border-white/25 px-3 py-1 text-xs text-white/85 transition hover:border-white/50 hover:text-white"
            aria-label="Terug"
          >
            ← <CmText contentKey="site.header.nav.back" as="span" fallback="Terug" />
          </button>
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-5 gap-y-2 md:flex-nowrap md:gap-x-7">
          <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 md:flex-nowrap md:gap-x-6">
            <Link href={guestHref} className="text-white/90 hover:text-white">
              <CmText contentKey="site.header.nav.guest" as="span" className="text-white/90" fallback="Gastenportaal" />
            </Link>
            <Link href={modelHref} className="text-white/90 hover:text-white">
              <CmText contentKey="site.header.nav.model" as="span" className="text-white/90" fallback="Modellenportaal" />
            </Link>
            <Link href="/klanten" className="text-white/90 hover:text-white">
              <CmText contentKey="site.header.nav.client" as="span" className="text-white/90" fallback="Klantenportaal" />
            </Link>
            <Link href="/reviews" className="text-white/90 hover:text-white">
              <CmText contentKey="site.header.nav.reviews" as="span" className="text-white/90" fallback="Reviews" />
            </Link>
            <Link href="/gasten/contact" className="text-white/90 hover:text-white">
              <CmText contentKey="site.header.nav.contact" as="span" className="text-white/90" fallback="Contact" />
            </Link>
            {user ? (
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push('/');
                  router.refresh();
                }}
                className="text-white/80 hover:text-white"
              >
                <CmText contentKey="site.header.nav.logout" as="span" className="text-white/80" fallback="Uitloggen" />
              </button>
            ) : (
              <Link href={loginHref} className="text-white/90 hover:text-white">
                <CmText contentKey="site.header.nav.login" as="span" className="text-white/90" fallback="Inloggen" />
              </Link>
            )}
          </nav>
          <GoogleTranslate variant="dark" className="shrink-0" />
        </div>
      </div>
    </header>
  );
}
