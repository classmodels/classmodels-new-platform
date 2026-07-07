'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { CmText } from '@/components/CmText';
import { GoogleTranslate } from '@/components/GoogleTranslate';

export function SiteHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const onAdmin = pathname?.startsWith('/admin');
  if (onAdmin) return null;

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
            <Link href="/?go=guest" className="text-white/90 hover:text-white">
              <CmText contentKey="site.header.nav.guest" as="span" className="text-white/90" fallback="Gastenportaal" />
            </Link>
            <Link href={user ? '/portal/model' : '/lobby?tab=model'} className="text-white/90 hover:text-white">
              <CmText contentKey="site.header.nav.model" as="span" className="text-white/90" fallback="Modellenportaal" />
            </Link>
            <Link href="/portal/client" className="text-white/90 hover:text-white">
              <CmText contentKey="site.header.nav.client" as="span" className="text-white/90" fallback="Klantenportaal" />
            </Link>
            <Link href="/reviews" className="text-white/90 hover:text-white">
              <CmText contentKey="site.header.nav.reviews" as="span" className="text-white/90" fallback="Reviews" />
            </Link>
            <Link href="/portal/guest?p=contact" className="text-white/90 hover:text-white">
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
              <Link href="/lobby?tab=model" className="text-white/90 hover:text-white">
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
