'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { ADMIN_MODULES } from '@/app/admin/admin-nav';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading, canAccessAdminShell, can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user || !canAccessAdminShell) router.replace('/login');
  }, [user, loading, canAccessAdminShell, router]);

  if (loading || !user || !canAccessAdminShell) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-panel text-sm text-muted">
        Laden…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-100 text-zinc-900">
      <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-800 bg-ink text-white">
        <div className="border-b border-white/10 px-4 py-4 text-sm font-semibold tracking-tight">
          Class Models — backsite
        </div>
        <nav className="flex-1 overflow-y-auto py-2 text-[13px]">
          {ADMIN_MODULES.filter((m) => {
            if (!('permission' in m) || !m.permission) return true;
            return can(m.permission);
          }).map((m) => {
            const href = `/admin/${m.slug}`;
            const active =
              pathname === href ||
              (m.slug === 'dashboard' && (pathname === '/admin' || pathname === '/admin/dashboard')) ||
              (m.slug === 'agenda' && pathname.startsWith('/admin/agenda')) ||
              (m.slug === 'modellen-profielen' && pathname.startsWith('/admin/modellen-profielen')) ||
              (m.slug === 'testshoot' && pathname.startsWith('/admin/testshoot')) ||
              (m.slug === 'push-berichten' && pathname.startsWith('/admin/push-berichten')) ||
              (m.slug === 'push-lijsten' && pathname.startsWith('/admin/push-lijsten'));
            return (
              <Link
                key={m.slug}
                href={href}
                prefetch={false}
                className={[
                  'block px-4 py-2 hover:bg-white/10',
                  active ? 'bg-white/10 text-white' : 'text-white/80',
                ].join(' ')}
              >
                {m.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-page px-6 py-8">{children}</div>
      </div>
    </div>
  );
}
