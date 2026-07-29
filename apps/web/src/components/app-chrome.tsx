'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { AdminBar } from '@/components/AdminBar';
import { SiteHeader } from '@/components/SiteHeader';

export function AppChrome({ children }: { children: ReactNode }) {
  const { user, hasBackofficeAccess, can } = useAuth();
  const pathname = usePathname();
  const onAdmin = pathname?.startsWith('/admin');
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
  const onBeginPage =
    pathname === '/' ||
    pathname === '' ||
    (!!basePath && (pathname === basePath || pathname === `${basePath}/`));
  const onNieuwSite = pathname?.startsWith('/nieuw') ?? false;
  const showBar = !!user && (hasBackofficeAccess || can('content.strings.write'));

  return (
    <div className="flex min-h-screen flex-col">
      <AdminBar />
      {showBar ? <div className="h-10 shrink-0" aria-hidden /> : null}
      {/* Nieuwe site (/nieuw) heeft eigen navigatie. */}
      {!onAdmin && !onNieuwSite ? (
        <div className={onBeginPage ? 'hidden md:block' : undefined}>
          <SiteHeader />
        </div>
      ) : null}
      <main className={`relative z-0 min-h-0 flex-1 ${onBeginPage ? 'flex flex-col bg-[#0d0d11]' : ''}`}>
        {children}
      </main>
    </div>
  );
}
