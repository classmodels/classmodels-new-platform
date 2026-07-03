import type { CatalogModel } from '@/components/models-catalog/ModelsCatalogGrid';

const AVAIL_LABELS: Record<string, string> = {
  Modeshows: 'MODESHOWS',
  'Foto opdrachten': 'EDITORIAL',
  Reklame: 'COMMERCIAL',
  'Host/hostess': 'CAMPAIGNS',
  'Lingerie/Bikini': 'LINGERIE',
  'Artistiek naakt': 'ARTISTIC',
};

function sheetStr(sh: Record<string, unknown> | undefined, key: string): string {
  if (!sh) return '';
  const v = sh[key];
  if (v == null) return '';
  return String(v).trim();
}

function statCm(raw: string): string {
  const v = raw.trim();
  if (!v) return '—';
  if (/cm$/i.test(v)) return v.toUpperCase();
  if (/^\d+([.,]\d+)?$/.test(v)) return `${v} CM`;
  return v.toUpperCase();
}

function statText(raw: string): string {
  const v = raw.trim();
  return v ? v.toUpperCase() : '—';
}

export function showroomDisplayName(m: CatalogModel, isAdmin: boolean): string {
  const fn = (m.firstName ?? '').trim();
  const ln = (m.lastName ?? '').trim();
  const roster = fn && ln ? `${fn} ${ln}` : fn || ln || m.displayName;
  return (isAdmin ? roster : m.displayName || roster).toUpperCase();
}

export function splitDisplayName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

export function showroomSubtitle(m: CatalogModel): string {
  if (m.isNewface) return 'NEW FACE';
  if (m.isTryout) return 'TRY-OUT MODEL';
  return 'INTERNATIONAL MODEL';
}

export function showroomAvailLines(beschikbaar: string[]): string[] {
  return beschikbaar.map((b) => AVAIL_LABELS[b] ?? b.toUpperCase());
}

/** Beschikbaarheden op één regel, gescheiden door " - ". */
export function showroomAvailInline(beschikbaar: string[]): string {
  return beschikbaar.map((b) => b.trim()).filter(Boolean).join(' - ');
}

export function showroomStats(m: CatalogModel): [string, string][] {
  const sh = m.sheet ?? {};
  return [
    ['Lengte', statCm(sheetStr(sh, 'lengte'))],
    ['Borst', statCm(sheetStr(sh, 'borstomtrek'))],
    ['Taille', statCm(sheetStr(sh, 'taille'))],
    ['Heupen', statCm(sheetStr(sh, 'heupomtrek'))],
    ['Schoenen', statText(sheetStr(sh, 'schoenmaat'))],
    ['Haar', statText(sheetStr(sh, 'haarkleur'))],
    ['Ogen', statText(sheetStr(sh, 'kleurOgen'))],
  ];
}
