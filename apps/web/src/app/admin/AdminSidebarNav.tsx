'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ADMIN_DASHBOARD_ITEM,
  ADMIN_NAV_SECTIONS,
  filterNavSections,
  isAdminNavItemActive,
  sectionContainsPath,
  type AdminNavIconId,
} from '@/app/admin/admin-nav';

export function AdminNavIcon({ name, className }: { name: AdminNavIconId; className?: string }) {
  const c = className ?? 'h-[18px] w-[18px] shrink-0 opacity-90';
  switch (name) {
    case 'home':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
        </svg>
      );
    case 'layout':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      );
    case 'clipboard':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M9 4h6l1 2h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3l1-2Z" />
          <path d="M9 12h6M9 16h6" />
        </svg>
      );
    case 'users':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'credit':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      );
    case 'image':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      );
    case 'calendar':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case 'bell':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 7-3 7h14s-3 0-3-7" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case 'wrench':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      );
    default:
      return <span className={c} />;
  }
}

type Props = {
  pathname: string;
  can: (permission: string) => boolean;
};

export function AdminSidebarNav({ pathname, can }: Props) {
  const sections = useMemo(() => filterNavSections(ADMIN_NAV_SECTIONS, can), [can]);

  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const dashActive =
    pathname === ADMIN_DASHBOARD_ITEM.href ||
    pathname === '/admin' ||
    pathname === '/admin/';

  const linkBase =
    'flex items-center gap-2.5 rounded-md py-2 pl-2 pr-2 text-[13px] leading-snug transition outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60';

  return (
    <nav className="flex-1 overflow-y-auto px-2 pb-4 pt-1" aria-label="Admin menu">
      <Link
        href={ADMIN_DASHBOARD_ITEM.href}
        prefetch={false}
        className={[
          linkBase,
          dashActive ? 'bg-[#2271b1] text-white shadow-[inset_3px_0_0_0_#72aee6]' : 'text-zinc-200 hover:bg-white/[0.08]',
        ].join(' ')}
      >
        <AdminNavIcon name="home" className={dashActive ? 'h-[18px] w-[18px] shrink-0 text-white' : 'h-[18px] w-[18px] shrink-0'} />
        <span className="min-w-0 font-medium">{ADMIN_DASHBOARD_ITEM.label}</span>
      </Link>

      <div className="mt-2 space-y-0.5 border-t border-white/[0.06] pt-2">
        {sections.map((sec) => {
          const open = openIds.has(sec.id);
          const sectionActive = sectionContainsPath(sec, pathname);
          return (
            <div key={sec.id} className="rounded-md">
              <button
                type="button"
                onClick={() => toggle(sec.id)}
                className={[
                  'flex w-full items-center gap-2.5 rounded-md py-2 pl-2 pr-2 text-left text-[13px] font-semibold transition',
                  sectionActive && !open ? 'text-white' : 'text-zinc-100',
                  'hover:bg-white/[0.06]',
                ].join(' ')}
                aria-expanded={open}
              >
                <AdminNavIcon name={sec.icon} />
                <span className="min-w-0 flex-1">{sec.label}</span>
                <svg
                  className={['h-4 w-4 shrink-0 text-zinc-500 transition-transform', open ? 'rotate-180' : ''].join(' ')}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {open ? (
                <div className="ml-1.5 mt-0.5 rounded-md border border-white/[0.06] bg-[#2c3338] py-1.5 pl-1.5 pr-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <ul className="space-y-0.5">
                    {sec.items.map((it) => {
                      const active = isAdminNavItemActive(pathname, it.href);
                      return (
                        <li key={it.href}>
                          <Link
                            href={it.href}
                            prefetch={false}
                            className={[
                              'block rounded py-1.5 pl-2 pr-2 text-[12.5px] transition',
                              active
                                ? 'bg-[#2271b1] font-medium text-white shadow-[inset_3px_0_0_0_#72aee6]'
                                : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white',
                            ].join(' ')}
                          >
                            {it.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
