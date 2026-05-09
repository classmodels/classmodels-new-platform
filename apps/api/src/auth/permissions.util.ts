/** Voegt rol-permissies samen; `*` = alles. */
export function mergePermissionsFromRoles(roles: { permissions: unknown }[]): string[] {
  const out = new Set<string>();
  for (const r of roles) {
    const p = r.permissions;
    if (!Array.isArray(p)) continue;
    for (const x of p) {
      if (x === '*') out.add('*');
      else if (typeof x === 'string' && x.length > 0) out.add(x);
    }
  }
  return [...out];
}

export function hasEveryPermission(granted: string[], required: string[]): boolean {
  if (granted.includes('*')) return true;
  return required.every((r) => granted.includes(r));
}

export function premiumEffective(user: {
  isPremium: boolean;
  premiumUntil: Date | null;
  premiumOverride: boolean;
}): boolean {
  if (user.premiumOverride) return user.isPremium;
  return user.isPremium && (!user.premiumUntil || user.premiumUntil > new Date());
}
