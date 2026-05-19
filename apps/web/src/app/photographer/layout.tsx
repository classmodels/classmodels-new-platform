'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function PhotographerLayout({ children }: { children: ReactNode }) {
  const { user, loading, can, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user || !can('photographer.portfolio.upload')) {
      const next = pathname ? `/?next=${encodeURIComponent(pathname)}` : '/';
      router.replace(next);
    }
  }, [user, loading, can, router, pathname]);

  if (loading || !user || !can('photographer.portfolio.upload')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-sm text-muted">Laden…</div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <h1 className="text-sm font-semibold text-ink">Class Models — fotograaf (portfolio)</h1>
        <button
          type="button"
          className="text-xs font-medium text-burgundy hover:underline"
          onClick={() => {
            logout();
            router.replace('/');
          }}
        >
          Uitloggen
        </button>
      </header>
      <main className="mx-auto w-full max-w-page px-4 py-6">{children}</main>
    </div>
  );
}
