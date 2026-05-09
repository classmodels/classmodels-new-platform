/** Zichtbaarheid via `permission`; ontbreekt = elke gebruiker met backoffice-toegang. */
export const ADMIN_MODULES = [
  { slug: 'dashboard', label: 'Dashboard' },
  { slug: 'portalen', label: 'Portalen' },
  {
    slug: 'briefs',
    label: 'Casting-aanvragen',
    permission: 'admin.briefs.read' as const,
  },
  {
    slug: 'gebruikers',
    label: 'Gebruikers',
    permission: 'admin.users.read' as const,
  },
  { slug: 'rollen', label: 'Rollen', permission: 'admin.roles.read' as const },
  { slug: 'premium', label: 'Premium', permission: 'admin.subscriptions.read' as const },
  { slug: 'mollie', label: 'Mollie instellingen', permission: 'admin.billing.read' as const },
  { slug: 'menus', label: "Menu's", permission: 'admin.menus.read' as const },
  { slug: 'content', label: 'Content', permission: 'content.strings.write' as const },
  { slug: 'reviews', label: 'Reviews', permission: 'admin.reviews.read' as const },
  { slug: 'media', label: 'Media Library', permission: 'admin.media.read' as const },
  { slug: 'historiek', label: 'Historiek', permission: 'admin.audit.read' as const },
  { slug: 'snippets', label: 'Snippets / Plugins', permission: 'admin.snippets.read' as const },
] as const;

export type AdminModuleSlug = (typeof ADMIN_MODULES)[number]['slug'];

export function isAdminModuleSlug(s: string): s is AdminModuleSlug {
  return ADMIN_MODULES.some((m) => m.slug === s);
}
