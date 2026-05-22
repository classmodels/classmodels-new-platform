'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

const TABS = [
  { href: '/admin/communicatie/verzenden', label: 'Verzenden', permission: 'admin.push.send' },
  { href: '/admin/communicatie/lijsten', label: 'Contactlijsten', permission: 'admin.push.lists' },
  { href: '/admin/communicatie/geschiedenis', label: 'Geschiedenis', permission: 'admin.push.send' },
  { href: '/admin/communicatie/uitschrijvingen', label: 'Uitschrijvingen', permission: 'admin.push.send' },
] as const;

export default function CommunicatieLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { can } = useAuth();
  const tabs = TABS.filter((t) => can(t.permission));

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Communicatie</h1>
        <p className="mt-1 text-sm text-muted">Bulk e-mail en SMS naar modellen, lijsten of losse contacten.</p>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-line pb-2">
        {tabs.map((t) => {
          const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded px-3 py-1.5 text-xs font-medium ${
                active ? 'bg-zinc-900 text-white' : 'text-muted hover:bg-zinc-100 hover:text-ink'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
