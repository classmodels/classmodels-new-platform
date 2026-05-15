/** Icoon-id’s voor de sidebar (inline SVG in AdminSidebarNav). */
export type AdminNavIconId =
  | 'home'
  | 'layout'
  | 'clipboard'
  | 'users'
  | 'credit'
  | 'image'
  | 'calendar'
  | 'bell'
  | 'wrench';

export type AdminNavLeaf = {
  href: string;
  label: string;
  /** Ontbreekt = iedereen met backoffice-toegang. */
  permission?: string;
};

export type AdminNavSection = {
  id: string;
  label: string;
  icon: AdminNavIconId;
  items: AdminNavLeaf[];
};

/** Losse link bovenaan (zoals WP “Dashboard”). */
export const ADMIN_DASHBOARD_ITEM: AdminNavLeaf = {
  href: '/admin/dashboard',
  label: 'Dashboard',
};

/**
 * Gegroepeerde admin-navigatie: linker menu + dashboard-secties.
 * Rechten per item zoals voorheen in ADMIN_MODULES.
 */
export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    id: 'portal-content',
    label: 'Portal & content',
    icon: 'layout',
    items: [
      { href: '/admin/portalen', label: 'Portalen' },
      { href: '/admin/content', label: 'Content (CMS-sleutels)', permission: 'content.strings.write' },
      { href: '/admin/menus', label: "Menu's", permission: 'admin.menus.read' },
    ],
  },
  {
    id: 'opdrachten',
    label: 'Opdrachten',
    icon: 'clipboard',
    items: [{ href: '/admin/briefs', label: 'Casting / opdrachten', permission: 'admin.briefs.read' }],
  },
  {
    id: 'accounts',
    label: 'Accounts & rollen',
    icon: 'users',
    items: [
      { href: '/admin/modellen-profielen', label: 'Modellen', permission: 'admin.users.read' },
      { href: '/admin/gebruikers', label: 'Gebruikers', permission: 'admin.users.read' },
      { href: '/admin/rollen', label: 'Rollen', permission: 'admin.roles.read' },
    ],
  },
  {
    id: 'billing',
    label: 'Abonnementen & betaling',
    icon: 'credit',
    items: [
      { href: '/admin/premium', label: 'Premium & abonnementen', permission: 'admin.subscriptions.read' },
      { href: '/admin/tryout-modeshow', label: 'Try-out modeshow', permission: 'admin.billing.read' },
      { href: '/admin/mollie', label: 'Mollie-instellingen', permission: 'admin.billing.read' },
    ],
  },
  {
    id: 'media',
    label: 'Media & reviews',
    icon: 'image',
    items: [
      { href: '/admin/media', label: 'Media Library', permission: 'admin.media.read' },
      { href: '/admin/reviews', label: 'Reviews', permission: 'admin.reviews.read' },
      { href: '/admin/testshoot', label: 'Testshoot', permission: 'admin.testshoot.read' },
    ],
  },
  {
    id: 'agenda',
    label: 'Agenda / afspraken',
    icon: 'calendar',
    items: [
      { href: '/admin/agenda', label: 'Overzicht', permission: 'admin.agenda.read' },
      { href: '/admin/agenda/kalender', label: 'Kalender', permission: 'admin.agenda.read' },
      { href: '/admin/agenda/boekingen', label: 'Boekingen', permission: 'admin.agenda.read' },
      { href: '/admin/agenda/open-dagen', label: 'Open dagen', permission: 'admin.agenda.read' },
      { href: '/admin/agenda/agendas', label: "Agenda's", permission: 'admin.agenda.read' },
      { href: '/admin/agenda/momenten', label: 'Dagen & uren', permission: 'admin.agenda.read' },
      { href: '/admin/agenda/planning', label: 'Planning', permission: 'admin.agenda.read' },
      { href: '/admin/agenda/mail-preview', label: 'Mail / SMS', permission: 'admin.agenda.read' },
    ],
  },
  {
    id: 'communicatie',
    label: 'Communicatie',
    icon: 'bell',
    items: [
      { href: '/admin/push-berichten', label: 'Pushberichten', permission: 'admin.push.send' },
      { href: '/admin/push-lijsten', label: 'Push-lijsten', permission: 'admin.push.lists' },
    ],
  },
  {
    id: 'techniek',
    label: 'Beheer & techniek',
    icon: 'wrench',
    items: [
      { href: '/admin/statistieken', label: 'Statistieken', permission: 'admin.agenda.read' },
      { href: '/admin/historiek', label: 'Historiek / logs', permission: 'admin.audit.read' },
      { href: '/admin/snippets', label: 'Snippets / plugins', permission: 'admin.snippets.read' },
    ],
  },
];

export function filterNavLeaves(items: AdminNavLeaf[], can: (permission: string) => boolean): AdminNavLeaf[] {
  return items.filter((it) => !it.permission || can(it.permission));
}

export function filterNavSections(
  sections: AdminNavSection[],
  can: (permission: string) => boolean,
): AdminNavSection[] {
  return sections
    .map((sec) => ({ ...sec, items: filterNavLeaves(sec.items, can) }))
    .filter((sec) => sec.items.length > 0);
}

/** Exacte actieve route (subpaden niet op “ouder” laten matchen). */
export function isAdminNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return false;
}

/** Sectie openhouden als één van de kind-routes actief is. */
export function sectionContainsPath(section: AdminNavSection, pathname: string): boolean {
  return section.items.some((it) => pathname === it.href || pathname.startsWith(`${it.href}/`));
}

/** @deprecated Gebruik ADMIN_NAV_SECTIONS; enkel voor eventuele oude imports. */
export const ADMIN_MODULES = [
  { slug: 'dashboard', label: 'Dashboard' },
  { slug: 'portalen', label: 'Portalen' },
  { slug: 'briefs', label: 'Opdrachten', permission: 'admin.briefs.read' as const },
  { slug: 'modellen-profielen', label: 'Modellen', permission: 'admin.users.read' as const },
  { slug: 'gebruikers', label: 'Gebruikers', permission: 'admin.users.read' as const },
  { slug: 'rollen', label: 'Rollen', permission: 'admin.roles.read' as const },
  { slug: 'premium', label: 'Premium', permission: 'admin.subscriptions.read' as const },
  { slug: 'tryout-modeshow', label: 'Try-out modeshow', permission: 'admin.billing.read' as const },
  { slug: 'mollie', label: 'Mollie instellingen', permission: 'admin.billing.read' as const },
  { slug: 'menus', label: "Menu's", permission: 'admin.menus.read' as const },
  { slug: 'content', label: 'Content', permission: 'content.strings.write' as const },
  { slug: 'testshoot', label: 'Testshoot', permission: 'admin.testshoot.read' as const },
  { slug: 'reviews', label: 'Reviews', permission: 'admin.reviews.read' as const },
  { slug: 'agenda', label: 'Agenda / afspraken', permission: 'admin.agenda.read' as const },
  { slug: 'media', label: 'Media Library', permission: 'admin.media.read' as const },
  { slug: 'historiek', label: 'Historiek', permission: 'admin.audit.read' as const },
  { slug: 'snippets', label: 'Snippets / Plugins', permission: 'admin.snippets.read' as const },
  { slug: 'push-berichten', label: 'Pushberichten', permission: 'admin.push.send' as const },
  { slug: 'push-lijsten', label: 'Push-lijsten', permission: 'admin.push.lists' as const },
] as const;

export type AdminModuleSlug = (typeof ADMIN_MODULES)[number]['slug'];

export function isAdminModuleSlug(s: string): s is AdminModuleSlug {
  return ADMIN_MODULES.some((m) => m.slug === s);
}
