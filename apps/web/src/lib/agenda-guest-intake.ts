/** Gastagenda’s (intake / casting / gratis fotoshoot) — zelfde slugs als modelportaal “pro” variant. */
export const GUEST_INTAKE_CALENDAR_SLUGS = ['intake-gesprek', 'casting', 'gratis-fotoshoot'] as const;

export function isGuestIntakeCalendarSlug(slug: string): boolean {
  return (GUEST_INTAKE_CALENDAR_SLUGS as readonly string[]).includes(slug);
}

/** Niet verplicht op bovengenoemde gastagenda’s (foto, opmerkingen, “hoe bij ons terecht”). */
export const GUEST_INTAKE_OPTIONAL_FIELD_KEYS = new Set(['foto', 'bericht', 'hoe_terecht']);

export const GUEST_MINOR_PARENT_FIELD_KEYS = {
  name: 'ouder_naam',
  phone: 'ouder_gsm',
} as const;

/** Leeftijd op “vandaag” (lokale datum browser). */
export function ageFromIsoDateString(ymd: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd.trim())) return null;
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return null;
  const today = new Date();
  let age = today.getFullYear() - y;
  const hadBirthday =
    today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d);
  if (!hadBirthday) age -= 1;
  return age;
}

export function isMinorFromIsoDateString(ymd: string): boolean {
  const age = ageFromIsoDateString(ymd);
  if (age == null) return false;
  return age < 18;
}
