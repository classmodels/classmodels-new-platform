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
    <header className="border-b border-white/10 bg-ink text-white">
      {/*
        Zelfde horizontale inset als de gast-hero-video (50px): logo links, nav + talen rechts uitgelijnd.
      */}
      <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-[50px] py-2.5 text-sm md:flex-nowrap md:gap-x-8">
        <div className="min-w-0 shrink-0">
          <Link href="/" className="notranslate block">
            <CmText
              contentKey="site.header.logo"
              as="span"
              className="block font-serif text-2xl font-semibold leading-none tracking-tight text-burgundy md:text-[1.7rem]"
              fallback="Class-Models"
            />
          </Link>
          <CmText
            contentKey="site.header.tagline"
            as="p"
            className="mt-0.5 text-[11px] leading-tight text-white/70"
            fallback="Modeling Agency"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-5 gap-y-2 md:flex-nowrap md:gap-x-7">
          <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 md:flex-nowrap md:gap-x-6">
            <Link href="/portal/guest" className="text-white/90 hover:text-white">
              <CmText contentKey="site.header.nav.guest" as="span" className="text-white/90" fallback="Gastenportaal" />
            </Link>
            <Link href={user ? '/portal/model' : '/'} className="text-white/90 hover:text-white">
              <CmText contentKey="site.header.nav.model" as="span" className="text-white/90" fallback="Modellenportaal" />
            </Link>
            <Link href="/portal/client" className="text-white/90 hover:text-white">
              <CmText contentKey="site.header.nav.client" as="span" className="text-white/90" fallback="Klantenportaal" />
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
              <Link href="/" className="text-white/90 hover:text-white">
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
