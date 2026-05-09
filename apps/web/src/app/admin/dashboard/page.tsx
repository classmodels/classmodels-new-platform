import Link from 'next/link';

const LINKS = [
  { href: '/admin/briefs', label: 'Casting-aanvragen' },
  { href: '/admin/gebruikers', label: 'Gebruikers' },
  { href: '/admin/rollen', label: 'Rollen' },
  { href: '/admin/premium', label: 'Premium & abonnementen' },
  { href: '/admin/mollie', label: 'Mollie-instellingen' },
  { href: '/admin/menus', label: "Menu's" },
  { href: '/admin/content', label: 'Content (CMS-sleutels)' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/media', label: 'Media Library' },
  { href: '/admin/historiek', label: 'Historiek / logs' },
  { href: '/admin/snippets', label: 'Snippets / plugins' },
  { href: '/admin/portalen', label: 'Portalen' },
] as const;

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Dashboard</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Modules en zijbalk worden getoond op basis van jouw permissies. Casting-aanvragen koppelen klanten en
        modellen via de database.
      </p>
      <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map((m) => (
          <li key={m.href}>
            <Link
              href={m.href}
              className="block rounded-md border border-line bg-white px-4 py-3 text-sm text-ink shadow-sm hover:border-burgundy/40"
            >
              {m.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
