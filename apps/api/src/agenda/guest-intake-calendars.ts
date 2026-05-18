/** Gastagenda’s: intake, casting, gratis fotoshoot (gelijk met web `agenda-guest-intake.ts`). */
export const GUEST_INTAKE_CALENDAR_SLUGS = new Set(['intake-gesprek', 'casting', 'gratis-fotoshoot']);

export const GUEST_INTAKE_OPTIONAL_FIELD_KEYS = new Set(['foto', 'bericht', 'hoe_terecht']);

export const GUEST_MINOR_PARENT_FIELD_KEYS = {
  name: 'ouder_naam',
  phone: 'ouder_gsm',
} as const;

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
