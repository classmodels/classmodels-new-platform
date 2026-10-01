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

export function isLegacyGuestAgendaSlug(slug: string): boolean {
  return (LEGACY_GUEST_AGENDA_SLUGS as readonly string[]).includes(slug);
}

export function detectModelWordenPackage(
  fields: Record<string, unknown> | null | undefined,
): 'testshoot_intake' | 'intake_only' | null {
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

export function bookingAgendaDisplayLabel(
  calendarSlug: string,
  calendarTitle: string,
  fields: Record<string, unknown> | null | undefined,
): string {
  if (calendarSlug === 'model-worden') {
    const pkg = detectModelWordenPackage(fields);
    if (pkg === 'testshoot_intake') return 'Model worden · Testshoot + intake';
    if (pkg === 'intake_only') return 'Model worden · Alleen intake';
    return 'Model worden';
  }
  if (calendarSlug === 'gratis-fotoshoot') return 'Model worden · Testshoot + intake';
  if (calendarSlug === 'intake-gesprek') return 'Model worden · Alleen intake';
  if (calendarSlug === 'casting') return 'Model worden · Casting';
  return calendarTitle;
}
