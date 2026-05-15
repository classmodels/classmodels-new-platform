'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { AdminBar } from '@/components/AdminBar';
import { SiteHeader } from '@/components/SiteHeader';
import { GoogleTranslate } from '@/components/GoogleTranslate';

export function AppChrome({ children }: { children: ReactNode }) {
  const { user, hasBackofficeAccess, can } = useAuth();
  const pathname = usePathname();
  const onAdmin = pathname?.startsWith('/admin');
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
  const onBeginPage =
    pathname === '/' ||
    pathname === '' ||
    (!!basePath && (pathname === basePath || pathname === `${basePath}/`));
  const showBar = !!user && (hasBackofficeAccess || can('content.strings.write'));

  return (
    <>
      <AdminBar />
      {showBar ? <div className="h-10 shrink-0" aria-hidden /> : null}
      {!onAdmin && !onBeginPage ? <SiteHeader /> : null}
      {!onAdmin && onBeginPage ? (
        <div className="pointer-events-none fixed right-4 top-4 z-50 md:right-6 md:top-6">
          <div className="pointer-events-auto">
            <GoogleTranslate variant="dark" />
          </div>
        </div>
      ) : null}
      <main className="relative z-0 min-h-0">{children}</main>
    </>
  );
}
