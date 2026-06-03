import type { CatalogModel } from '@/components/models-catalog/ModelsCatalogGrid';

export function sheetStr(sh: Record<string, unknown> | undefined, key: string): string {
  if (!sh) return '';
  const v = sh[key];
  if (v == null) return '';
  const t = String(v).trim();
  return t || '';
}

export function rosterFullName(m: {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string;
  email?: string;
}): string {
  const fn = (m.firstName ?? '').trim();
  const ln = (m.lastName ?? '').trim();
  if (fn && ln) return `${fn} ${ln}`.trim();
  if (fn) return fn;
  if (ln) return ln;
  return m.displayName?.trim() || m.email || 'Model';
}

export function formatAdminAddress(sh: Record<string, unknown>): string {
  const parts = [
    sheetStr(sh, 'straat'),
    [sheetStr(sh, 'postcode'), sheetStr(sh, 'gemeente')].filter(Boolean).join(' '),
    sheetStr(sh, 'land'),
  ].filter(Boolean);
  return parts.join(', ') || '—';
}

export function genderNl(g: CatalogModel['gender'] | ''): string {
  if (g === 'man') return 'Man';
  if (g === 'vrouw') return 'Vrouw';
  return '—';
}
