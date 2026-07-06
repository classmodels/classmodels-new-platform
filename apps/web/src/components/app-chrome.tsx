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
  const isFullBleedGallery = pathname?.includes('/portal/model/gallery-3d');
  const showBar = !!user && (hasBackofficeAccess || can('content.strings.write'));

  return (
    <div className="flex min-h-screen flex-col">
      <AdminBar />
      {showBar ? <div className="h-10 shrink-0" aria-hidden /> : null}
      {!onAdmin && !isFullBleedGallery ? <SiteHeader /> : null}
      <main className="relative z-0 min-h-0 flex-1">{children}</main>
    </div>
  );
}
