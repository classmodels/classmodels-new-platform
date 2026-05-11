'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { CmText } from '@/components/CmText';

export function SiteHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const onAdmin = pathname?.startsWith('/admin');

  if (onAdmin) return null;

  return (
    <header className="border-b border-white/10 bg-ink text-white">
      <div className="mx-auto flex w-full max-w-page items-center justify-between px-4 py-2.5 text-sm md:px-6">
        <div>
          <Link href="/" className="block font-serif text-xl font-semibold tracking-tight text-white">
            <CmText contentKey="site.header.logo" as="span" className="text-white" fallback="Class-Models" />
          </Link>
          <CmText
            contentKey="site.header.tagline"
            as="p"
            className="text-[11px] leading-tight text-white/70"
            fallback="Modeling Agency"
          />
        </div>
        <nav className="flex flex-wrap items-center gap-4">
          <Link href="/portal/guest" className="text-white/90 hover:text-white">
            <CmText contentKey="site.header.nav.guest" as="span" className="text-white/90" fallback="Gastenportaal" />
          </Link>
          <Link href="/portal/model" className="text-white/90 hover:text-white">
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
            <Link href="/login" className="text-white/90 hover:text-white">
              <CmText contentKey="site.header.nav.login" as="span" className="text-white/90" fallback="Inloggen" />
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
