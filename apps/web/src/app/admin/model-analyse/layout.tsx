'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

const TABS = [
  { href: '/admin/model-analyse', label: 'Instellingen', permission: 'admin.users.read' },
  { href: '/admin/model-analyse/open', label: 'Niet afgewerkt', permission: 'admin.users.read' },
  { href: '/admin/model-analyse/betaald', label: 'Afgewerkt', permission: 'admin.users.read' },
] as const;

export default function ModelAnalyseLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { can } = useAuth();
  const tabs = TABS.filter((tab) => can(tab.permission));

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Modellenanalyses</h1>
        <p className="mt-1 text-sm text-muted">Sleutels, begonnen dossiers en betaalde analyses.</p>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-line pb-2">
        {tabs.map((tab) => {
          const active = tab.href === '/admin/model-analyse' ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded px-3 py-1.5 text-xs font-medium ${
                active ? 'bg-zinc-900 text-white' : 'text-muted hover:bg-zinc-100 hover:text-ink'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
