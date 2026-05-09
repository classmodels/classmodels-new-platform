export const ROLES = ['admin', 'model', 'client', 'guest'] as const;
export type RoleSlug = (typeof ROLES)[number];
