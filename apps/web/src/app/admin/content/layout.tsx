'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/admin/content', label: 'Teksten', hint: 'Knoppen, titels, korte zinnen' },
  { href: '/admin/content/paginas', label: "Pagina's", hint: 'Foto, video, kolommen' },
  { href: '/admin/content/downloads', label: 'Portaal-downloads', hint: 'Knop → mediabestand' },
  { href: '/admin/menus', label: "Menu's", hint: 'Links naar pagina\'s' },
] as const;

export default function AdminContentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-panel/40 p-1">
        <p className="px-2 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">Site-inhoud</p>
        <div className="mt-1 flex flex-wrap gap-1 p-1">
          {tabs.map((t) => {
            const active =
              t.href === '/admin/content'
                ? pathname === '/admin/content'
                : pathname === t.href ||
                  pathname.startsWith(`${t.href}/`) ||
                  (t.href === '/admin/content/paginas' && pathname === '/admin/content/technisch');
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`rounded-md px-3 py-2 text-sm ${
                  active ? 'bg-burgundy text-white shadow-sm' : 'text-ink hover:bg-white'
                }`}
              >
                <span className="font-medium">{t.label}</span>
                <span className={`mt-0.5 block text-[10px] ${active ? 'text-white/85' : 'text-muted'}`}>
                  {t.hint}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}
