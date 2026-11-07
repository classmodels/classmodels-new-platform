'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { ADMIN_NAV_SECTIONS, filterNavSections, type AdminNavIconId, type AdminNavLeaf, type AdminNavSection } from '@/app/admin/admin-nav';
import { AdminNavIcon } from '@/app/admin/AdminSidebarNav';
import { useAdminNavSections } from '@/app/admin/use-admin-nav';

type DashboardQuickLink = AdminNavLeaf & { sectionLabel?: string; sectionIcon?: AdminNavIconId };

function mergeSections(primary: AdminNavSection[], extra: AdminNavSection[]) {
  const sections = primary.map((sec) => ({ ...sec, items: [...sec.items] }));
  for (const sec of extra) {
    const known = new Set(sections.flatMap((item) => item.items.map((leaf) => leaf.href)));
    const fresh = sec.items.filter((leaf) => !known.has(leaf.href));
    if (!fresh.length) continue;
    const target = sections.find((item) => item.id === sec.id);
    if (target) target.items.push(...fresh);
    else sections.push({ ...sec, items: fresh });
  }
  return sections;
}

export default function AdminDashboardPage() {
  const { can } = useAuth();
  const { sections: menuSections } = useAdminNavSections(can);
  const sections = useMemo(
    () => mergeSections(menuSections, filterNavSections(ADMIN_NAV_SECTIONS, can)),
    [menuSections, can],
  );

  const allLinks: DashboardQuickLink[] = useMemo(
    () =>
      sections.flatMap((s) =>
        s.items.map((it) => ({
          ...it,
          sectionLabel: s.label,
          sectionIcon: s.icon,
        })),
      ),
    [sections],
  );

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Dashboard</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        Overzicht van alle onderdelen van de backsite die bij jouw account zichtbaar zijn. Gebruik het menu links
        voor snelle navigatie; onderstaande blokken volgen dezelfde structuur (hoofdstuk → pagina’s).
      </p>

      <section className="mt-8">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted">Alle snelkoppelingen</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {allLinks.map((m) => (
            <li key={m.href}>
              <Link
                href={m.href}
                className="flex items-start gap-3 rounded-md border border-line bg-white px-3 py-3 text-sm text-ink shadow-sm hover:border-burgundy/40"
              >
                <AdminNavIcon
                  name={m.sectionIcon ?? 'home'}
                  className="mt-0.5 h-[18px] w-[18px] shrink-0 text-burgundy"
                />
                <span className="min-w-0">
                  <span className="block font-medium leading-tight">{m.label}</span>
                  {m.sectionLabel ? (
                    <span className="mt-0.5 block text-[11px] text-muted">{m.sectionLabel}</span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 space-y-8">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted">Per onderdeel</h2>
        {sections.map((sec) => (
          <div key={sec.id} className="rounded-lg border border-line bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <AdminNavIcon name={sec.icon} className="h-5 w-5 text-burgundy" />
              <h3 className="text-base font-semibold text-ink">{sec.label}</h3>
            </div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sec.items.map((it) => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className="block rounded border border-line bg-panel px-3 py-2.5 text-sm text-ink hover:border-burgundy/35"
                  >
                    {it.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
