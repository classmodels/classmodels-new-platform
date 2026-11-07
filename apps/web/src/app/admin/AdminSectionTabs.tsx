'use client';

import Link from 'next/link';
import { sectionContainsPath } from '@/app/admin/admin-nav';
import { useAdminNavSections } from '@/app/admin/use-admin-nav';

export function AdminSectionTabs({
  pathname,
  can,
}: {
  pathname: string;
  can: (permission: string) => boolean;
}) {
  const { sections } = useAdminNavSections(can);
  const section = sections.find((item) => sectionContainsPath(item, pathname));
  if (!section || section.items.length < 2) return null;

  const active = section.items.reduce<(typeof section.items)[number] | null>((best, item) => {
    const hit = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (!hit) return best;
    if (!best || item.href.length > best.href.length) return item;
    return best;
  }, null);

  return (
    <nav className="mb-4 flex flex-wrap gap-1 border-b border-zinc-200 pb-2" aria-label={section.label}>
      {section.items.map((item) => {
        const on = item.href === active?.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded px-3 py-1.5 text-xs font-medium ${
              on ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
            aria-current={on ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
