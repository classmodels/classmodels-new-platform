'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { AdminSidebarNav } from '@/app/admin/AdminSidebarNav';
import { MobileAppBar } from '@/components/MobileAppBar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading, canAccessAdminShell, can, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    // Ingelogd zonder backsite-rechten: blijf hier met uitleg (niet stil terug naar home).
    if (user && !canAccessAdminShell) return;
    if (!user) {
      const next = pathname ? `/?m=model&next=${encodeURIComponent(pathname)}` : '/?m=model';
      router.replace(next);
    }
  }, [user, loading, canAccessAdminShell, router, pathname]);

  if (loading) {
    return (
      <div className="notranslate flex min-h-screen items-center justify-center bg-[#1e2329] text-sm text-zinc-300">
        Laden…
      </div>
    );
  }

  if (user && !canAccessAdminShell) {
    return (
      <div className="notranslate flex min-h-screen flex-col items-center justify-center gap-4 bg-[#1e2329] px-6 text-center text-zinc-200">
        <p className="text-sm font-semibold text-white">Geen toegang tot de backsite</p>
        <p className="max-w-md text-sm text-zinc-400">
          Je bent nu ingelogd als <span className="text-zinc-200">{user.email}</span>
          {user.roles?.length ? ` (${user.roles.join(', ')})` : ''}. Dit account heeft geen
          administratorrechten. Log eerst uit en log opnieuw in met je admin-account.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="rounded bg-white px-4 py-2 text-sm font-medium text-zinc-900"
            onClick={() => {
              logout();
              const next = pathname ? `/?m=model&next=${encodeURIComponent(pathname)}` : '/?m=model';
              router.replace(next);
            }}
          >
            Uitloggen en als admin inloggen
          </button>
          <Link href="/" className="text-sm text-zinc-400 underline-offset-2 hover:underline">
            Naar home
          </Link>
        </div>
      </div>
    );
  }

  if (!user || !canAccessAdminShell) {
    return (
      <div className="notranslate flex min-h-screen items-center justify-center bg-[#1e2329] text-sm text-zinc-300">
        Laden…
      </div>
    );
  }

  return (
    <div className="notranslate min-h-screen bg-[#f0f0f1] text-zinc-900">
      <MobileAppBar
        title="Backsite"
        subtitle="Class Models"
        menuTitle="Backsite"
        tone="dark"
        menuContent={
          <div className="bg-[#1e2329] text-zinc-200">
            <AdminSidebarNav pathname={pathname} can={can} />
          </div>
        }
      />
      <div className="flex min-h-screen">
        <aside className="hidden w-[260px] shrink-0 flex-col border-r border-black/20 bg-[#1e2329] text-zinc-200 shadow-[2px_0_8px_rgba(0,0,0,0.12)] lg:flex">
          <div className="border-b border-white/[0.08] px-3 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Class Models</p>
            <p className="mt-0.5 text-sm font-semibold text-white">Backsite</p>
          </div>
          <AdminSidebarNav pathname={pathname} can={can} />
        </aside>
        <div className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-page px-3 py-4 md:px-6 md:py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
