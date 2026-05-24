/** Gastagenda’s: intake, casting, gratis fotoshoot (gelijk met web `agenda-guest-intake.ts`). */
export const GUEST_INTAKE_CALENDAR_SLUGS = new Set(['intake-gesprek', 'casting', 'gratis-fotoshoot']);

export const GUEST_INTAKE_OPTIONAL_FIELD_KEYS = new Set(['foto', 'bericht', 'hoe_terecht']);

/** Niet verplicht bij online boeking door gasten (alle agenda's). */
export const GUEST_BOOKING_OPTIONAL_FIELD_KEYS = new Set([
  'foto',
  'bericht',
  'opmerkingen',
  'hoe_terecht',
  'hoe_bij_ons',
  'referentie',
  'via',
]);

export function isGuestBookingOptionalFieldKey(fieldKey: string, fieldType?: string): boolean {
  if (fieldType === 'file') return true;
  const k = fieldKey.trim().toLowerCase();
  if (GUEST_BOOKING_OPTIONAL_FIELD_KEYS.has(fieldKey)) return true;
  if (GUEST_BOOKING_OPTIONAL_FIELD_KEYS.has(k)) return true;
  if (k.includes('opmerking') || k === 'bericht') return true;
  if (k.startsWith('hoe_') || k.includes('terecht') || k.includes('referent')) return true;
  return false;
}

/** Ingeschreven bij het bureau (admin-status). */
export function isAgendaBookingEnrolled(status: string): boolean {
  return status === 'confirmed';
}

export const GUEST_MINOR_PARENT_FIELD_KEYS = {
  with: 'ouder_met',
  name: 'ouder_naam',
  phone: 'ouder_gsm',
} as const;

export const GUEST_MINOR_WITH_OPTIONS = ['vader', 'moeder', 'allebei_ouders'] as const;

export function isValidGuestMinorWithChoice(raw: string | null | undefined): boolean {
  const v = raw?.trim().toLowerCase();
  return (GUEST_MINOR_WITH_OPTIONS as readonly string[]).includes(v ?? '');
}

export function isGuestIntakeCalendarSlug(slug: string): boolean {
  return GUEST_INTAKE_CALENDAR_SLUGS.has(slug);
}

/** Leeftijd op vandaag (server lokale datum). */
export function ageFromIsoDateString(ymd: string): number | null {
  const t = ymd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const [y, m, d] = t.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return null;
  const now = new Date();
  let age = now.getFullYear() - y;
  const hadBirthday = now.getMonth() + 1 > m || (now.getMonth() + 1 === m && now.getDate() >= d);
  if (!hadBirthday) age -= 1;
  return age;
}

export function isMinorFromIsoDateString(ymd: string): boolean {
  const age = ageFromIsoDateString(ymd);
  if (age == null) return false;
  return age < 18;
}
