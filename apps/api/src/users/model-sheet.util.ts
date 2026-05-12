import type { Prisma } from '@prisma/client';

const STR_MAX = 800;
const TXT_MAX = 16000;

const STRING_KEYS = new Set([
  'geboortedatum',
  'nationaliteit',
  'straat',
  'postcode',
  'gemeente',
  'land',
  'gsmMoeder',
  'gsmVader',
  'facebook',
  'instagram',
  'tiktok',
  'rekeningnummer',
  'lengte',
  'maat',
  'schoenmaat',
  'haarkleur',
  'kleurOgen',
  'bhMaat',
  'borstomtrek',
  'confectiemaat',
  'heupomtrek',
  'jeansmaat',
  'taille',
  'gsmModel',
]);

const TEXT_KEYS = new Set(['overMij', 'ervaringen']);

const ARRAY_KEYS = new Set(['geslacht', 'beschikbaar']);

/** Zelfde waarden als WP `registratie-modellen.php` (beschikbaar[]). */
export const BESCHIKBAAR_OPTS = [
  'Modeshows',
  'Foto opdrachten',
  'Reklame',
  'Host/hostess',
  'Lingerie/Bikini',
  'Artistiek naakt',
] as const;

const BESCHIKBAAR_WHITELIST = new Set<string>(BESCHIKBAAR_OPTS);

function clipStr(v: unknown, max: number): string | null {
  if (v == null) return null;
  const s = typeof v === 'string' ? v : String(v);
  return s.slice(0, max);
}

const TIMELINE_ENTRY_TEXT_MAX = 8000;
const TIMELINE_MAX_ENTRIES = 300;

function clipTimelineText(v: unknown, max: number): string {
  if (v == null) return '';
  const s = typeof v === 'string' ? v : String(v);
  return s.slice(0, max).trim();
}

function parseAtOrNow(atRaw: unknown): string {
  if (typeof atRaw !== 'string' || atRaw.length < 10) return new Date().toISOString();
  const t = Date.parse(atRaw);
  return Number.isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
}

/** Admin-opmerkingen op modellenfiche-JSON; alleen dit veld wordt hier verwerkt. */
export function sanitizeAdminTimeline(
  v: unknown,
): Array<{ id: string; at: string; text: string }> | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: { id: string; at: string; text: string }[] = [];
  for (const item of v.slice(-TIMELINE_MAX_ENTRIES)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const idRaw = o.id;
    const id =
      typeof idRaw === 'string' && idRaw.length > 0 && idRaw.length <= 80
        ? idRaw
        : `${Date.now()}-${out.length}-${Math.random().toString(36).slice(2, 9)}`;
    const at = parseAtOrNow(o.at);
    const text = clipTimelineText(o.text, TIMELINE_ENTRY_TEXT_MAX);
    if (!text) continue;
    out.push({ id, at, text });
  }
  return out;
}

/** Voegt alleen toegestane sleutels uit `patch` toe; bestaande JSON blijft behouden. */
export function sanitizeModelSheetMerge(
  existing: Prisma.JsonValue | null | undefined,
  patch: Record<string, unknown>,
): Prisma.InputJsonValue {
  const base: Record<string, unknown> =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};

  for (const [k, v] of Object.entries(patch)) {
    if (STRING_KEYS.has(k)) {
      base[k] = clipStr(v, STR_MAX);
    } else if (TEXT_KEYS.has(k)) {
      base[k] = clipStr(v, TXT_MAX);
    } else if (ARRAY_KEYS.has(k)) {
      if (!Array.isArray(v)) continue;
      const arr = v.filter((x) => typeof x === 'string').map((x) => x.slice(0, 120));
      if (k === 'beschikbaar') {
        base[k] = arr.filter((x) => BESCHIKBAAR_WHITELIST.has(x));
      } else if (k === 'geslacht') {
        base[k] = arr.filter((x) => x === 'man' || x === 'vrouw');
      }
    } else if (k === 'adminTimeline') {
      const st = sanitizeAdminTimeline(v);
      if (st !== undefined) base[k] = st;
    }
  }

  return base as Prisma.InputJsonValue;
}
