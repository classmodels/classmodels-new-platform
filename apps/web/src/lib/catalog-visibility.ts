export const CATALOG_VISIBILITY_OPTS = [
  {
    id: 'hidden',
    label: 'Alleen in admin-fiche / backoffice',
  },
  {
    id: 'public',
    label: 'Frontend voor bezoekers',
  },
  {
    id: 'admin_frontend',
    label: 'Alleen frontend voor admin',
  },
] as const;

export type CatalogVisibility = (typeof CATALOG_VISIBILITY_OPTS)[number]['id'];

export function isGroupingRoleSlug(slug: string): boolean {
  return !['admin', 'client', 'guest', 'fotograaf', 'model'].includes(slug);
}
