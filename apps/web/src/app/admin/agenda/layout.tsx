'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const SUBNAV = [
  { href: '/admin/agenda', label: 'Overzicht' },
  { href: '/admin/agenda/agendas', label: "Agenda's" },
  { href: '/admin/agenda/planning', label: 'Planning' },
  { href: '/admin/agenda/boekingen', label: 'Boekingen' },
  { href: '/admin/agenda/mail-preview', label: 'Mail voorbeeld' },
] as const;

export default function AdminAgendaLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Agenda / afspraken</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Kies een agenda op het overzicht om uren, open dagen en zichtbaarheid in te stellen. Planning en boekingen
          vindt u hieronder. Gasten boeken via het gastenportaal.
        </p>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-zinc-200 pb-2 text-[13px]">
        {SUBNAV.map((item) => {
          const active =
            item.href === '/admin/agenda'
              ? pathname === '/admin/agenda' || pathname.startsWith('/admin/agenda/calendar/')
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={[
                'rounded-md px-3 py-1.5 font-medium transition-colors',
                active ? 'bg-burgundy text-white' : 'text-zinc-700 hover:bg-zinc-200/80',
              ].join(' ')}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
