/** Spiegel van API model-worden-mail helpers (admin UI). */

export const LEGACY_GUEST_AGENDA_SLUGS = [
  'intake-gesprek',
  'casting',
  'gratis-fotoshoot',
] as const;

export const MODEL_WORDEN_FAMILY_SLUGS = [
  'model-worden',
  ...LEGACY_GUEST_AGENDA_SLUGS,
] as const;

export const MODEL_WORDEN_PKG_TARGET_TESTSHOOT = 'model-worden:testshoot_intake';
export const MODEL_WORDEN_PKG_TARGET_INTAKE = 'model-worden:intake_only';

export const MODEL_WORDEN_PACKAGE_TARGET_KEYS = [
  MODEL_WORDEN_PKG_TARGET_TESTSHOOT,
  MODEL_WORDEN_PKG_TARGET_INTAKE,
] as const;

export type ModelWordenPackage = 'testshoot_intake' | 'intake_only';

export function isLegacyGuestAgendaSlug(slug: string): boolean {
  return (LEGACY_GUEST_AGENDA_SLUGS as readonly string[]).includes(slug);
}

export function isModelWordenFamilySlug(slug: string): boolean {
  return (MODEL_WORDEN_FAMILY_SLUGS as readonly string[]).includes(slug);
}

export function isModelWordenPackageTargetKey(slug: string): boolean {
  return (MODEL_WORDEN_PACKAGE_TARGET_KEYS as readonly string[]).includes(slug);
}

export function detectModelWordenPackage(
  fields: Record<string, unknown> | null | undefined,
): ModelWordenPackage | null {
  if (!fields || typeof fields !== 'object') return null;
  const raw = String(fields.pakket ?? fields.package ?? fields.opmerkingen ?? '')
    .trim()
    .toLowerCase();
  if (!raw) return null;
  if (raw.includes('testshoot') || raw.includes('fotoshoot') || raw.includes('foto')) {
    return 'testshoot_intake';
  }
  if (raw.includes('intake')) return 'intake_only';
  return null;
}

export function effectiveModelWordenPackage(
  calendarSlug: string,
  fields: Record<string, unknown> | null | undefined,
): ModelWordenPackage | null {
  if (calendarSlug === 'gratis-fotoshoot') return 'testshoot_intake';
  if (calendarSlug === 'intake-gesprek') return 'intake_only';
  if (calendarSlug === 'casting') return null;
  if (calendarSlug === 'model-worden') return detectModelWordenPackage(fields);
  return null;
}

function parseTemplateSlugList(templateSlugsRaw: unknown): string[] {
  let v: unknown = templateSlugsRaw;
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return [];
    try {
      v = JSON.parse(t) as unknown;
    } catch {
      return [];
    }
  }
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return [];
}

/** Of een sjabloon geldt voor deze boeking (agenda + optioneel pakket). */
export function templateAppliesToBooking(
  templateSlugsRaw: unknown,
  calendarSlug: string,
  fields?: Record<string, unknown> | null,
): boolean {
  const slugs = parseTemplateSlugList(templateSlugsRaw);
  if (!slugs.length) return false;
  if (slugs.includes(calendarSlug)) return true;
  if (!isModelWordenFamilySlug(calendarSlug)) return false;
  if (slugs.includes('model-worden')) return true;
  const pkg = effectiveModelWordenPackage(calendarSlug, fields ?? null);
  if (pkg === 'testshoot_intake') {
    return (
      slugs.includes(MODEL_WORDEN_PKG_TARGET_TESTSHOOT) || slugs.includes('gratis-fotoshoot')
    );
  }
  if (pkg === 'intake_only') {
    return slugs.includes(MODEL_WORDEN_PKG_TARGET_INTAKE) || slugs.includes('intake-gesprek');
  }
  if (calendarSlug === 'model-worden' || calendarSlug === 'casting') {
    return (
      slugs.includes(MODEL_WORDEN_PKG_TARGET_TESTSHOOT) ||
      slugs.includes(MODEL_WORDEN_PKG_TARGET_INTAKE) ||
      slugs.includes('casting')
    );
  }
  return false;
}

/** Checkbox-opties voor sjablonen: actieve agenda’s + Model worden pakketten. */
export function adminTemplateAgendaTargets(
  calendars: ReadonlyArray<{ slug: string; title: string; active?: boolean }>,
): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  for (const c of calendars) {
    if (c.active === false) continue;
    if (isLegacyGuestAgendaSlug(c.slug)) continue;
    if (c.slug === 'model-worden') continue;
    out.push({ key: c.slug, label: c.title });
  }
  out.push(
    { key: MODEL_WORDEN_PKG_TARGET_TESTSHOOT, label: 'Model worden · Intake + fotoshoot' },
    { key: MODEL_WORDEN_PKG_TARGET_INTAKE, label: 'Model worden · Alleen intake' },
  );
  return out;
}

/** Legacy slugs → pakket-targets bij bewerken. */
export function normalizeTemplateSlugPick(slugs: Iterable<string>): Set<string> {
  const n = new Set<string>();
  for (const raw of slugs) {
    const s = String(raw).trim();
    if (!s) continue;
    if (s === 'intake-gesprek') n.add(MODEL_WORDEN_PKG_TARGET_INTAKE);
    else if (s === 'gratis-fotoshoot') n.add(MODEL_WORDEN_PKG_TARGET_TESTSHOOT);
    else if (s === 'casting') {
      n.add(MODEL_WORDEN_PKG_TARGET_INTAKE);
      n.add(MODEL_WORDEN_PKG_TARGET_TESTSHOOT);
    } else if (s === 'model-worden') {
      n.add(MODEL_WORDEN_PKG_TARGET_INTAKE);
      n.add(MODEL_WORDEN_PKG_TARGET_TESTSHOOT);
    } else if (!isLegacyGuestAgendaSlug(s)) n.add(s);
  }
  return n;
}

export function defaultTemplateSlugPick(
  calendars: ReadonlyArray<{ slug: string; active?: boolean }>,
): Set<string> {
  const n = new Set<string>();
  for (const c of calendars) {
    if (c.active === false) continue;
    if (isLegacyGuestAgendaSlug(c.slug) || c.slug === 'model-worden') continue;
    n.add(c.slug);
  }
  n.add(MODEL_WORDEN_PKG_TARGET_TESTSHOOT);
  n.add(MODEL_WORDEN_PKG_TARGET_INTAKE);
  return n;
}

/**
 * Admin-query: als Model worden (of een legacy gast-agenda) geselecteerd is,
 * altijd de hele familie meenemen zodat oude intake/casting/fotoshoot-boekingen
 * zichtbaar blijven — ook als die agenda's inactief zijn / geen knop meer hebben.
 */
export function expandAgendaCalendarIdsForQuery(
  selectedIds: Iterable<string>,
  calendars: ReadonlyArray<{ id: string; slug: string }>,
): string[] {
  const selected = new Set(selectedIds);
  const byId = new Map(calendars.map((c) => [c.id, c]));
  const familyIds = calendars.filter((c) => isModelWordenFamilySlug(c.slug)).map((c) => c.id);

  const touchesFamily = [...selected].some((id) => {
    const slug = byId.get(id)?.slug;
    return slug ? isModelWordenFamilySlug(slug) : false;
  });

  if (touchesFamily) {
    for (const id of familyIds) selected.add(id);
  }

  return [...selected];
}

export function bookingAgendaDisplayLabel(
  calendarSlug: string,
  calendarTitle: string,
  fields: Record<string, unknown> | null | undefined,
): string {
  if (calendarSlug === 'model-worden') {
    const pkg = detectModelWordenPackage(fields);
    if (pkg === 'testshoot_intake') return 'Model worden · Intake + fotoshoot';
    if (pkg === 'intake_only') return 'Model worden · Alleen intake';
    return 'Model worden';
  }
  if (calendarSlug === 'gratis-fotoshoot') return 'Model worden · Intake + fotoshoot';
  if (calendarSlug === 'intake-gesprek') return 'Model worden · Alleen intake';
  if (calendarSlug === 'casting') return 'Model worden · Casting';
  return calendarTitle;
}

/** Kort pakketbadge voor admin-lijst (onder of naast agenda). */
export function bookingPackageBadge(
  calendarSlug: string,
  fields: Record<string, unknown> | null | undefined,
): string | null {
  if (
    calendarSlug === 'model-worden' ||
    calendarSlug === 'gratis-fotoshoot' ||
    calendarSlug === 'intake-gesprek'
  ) {
    const pkg = detectModelWordenPackage(fields);
    if (pkg === 'testshoot_intake' || calendarSlug === 'gratis-fotoshoot') {
      return 'Intake + fotoshoot';
    }
    if (pkg === 'intake_only' || calendarSlug === 'intake-gesprek') {
      return 'Alleen intake';
    }
  }
  return null;
}
