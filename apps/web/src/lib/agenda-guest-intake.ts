/** Gastagenda’s (intake / casting / gratis fotoshoot) — zelfde slugs als modelportaal “pro” variant. */
export const GUEST_INTAKE_CALENDAR_SLUGS = ['intake-gesprek', 'casting', 'gratis-fotoshoot'] as const;

export function isGuestIntakeCalendarSlug(slug: string): boolean {
  return (GUEST_INTAKE_CALENDAR_SLUGS as readonly string[]).includes(slug);
}

/** Niet verplicht op bovengenoemde gastagenda’s (foto, opmerkingen, “hoe bij ons terecht”). */
export const GUEST_INTAKE_OPTIONAL_FIELD_KEYS = new Set(['foto', 'bericht', 'hoe_terecht', 'opmerkingen']);

/** Niet verplicht bij elke online gastboeking (alle agenda's). */
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
  if (GUEST_BOOKING_OPTIONAL_FIELD_KEYS.has(fieldKey) || GUEST_BOOKING_OPTIONAL_FIELD_KEYS.has(k)) return true;
  if (k.includes('opmerking') || k === 'bericht') return true;
  if (k.startsWith('hoe_') || k.includes('terecht') || k.includes('referent')) return true;
  return false;
}

export const GUEST_MINOR_PARENT_FIELD_KEYS = {
  with: 'ouder_met',
  name: 'ouder_naam',
  phone: 'ouder_gsm',
  fatherName: 'ouder_naam_vader',
  fatherPhone: 'ouder_gsm_vader',
  motherName: 'ouder_naam_moeder',
  motherPhone: 'ouder_gsm_moeder',
} as const;

export const GUEST_MINOR_WITH_OPTIONS = [
  { value: 'vader', label: 'Mijn vader' },
  { value: 'moeder', label: 'Mijn moeder' },
  { value: 'allebei_ouders', label: 'Allebei ouders' },
] as const;

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

/** Client-side validatie oudergegevens (zelfde regels als API). */
export function validateGuestMinorParentFieldsClient(form: Record<string, string>): string | null {
  const withWho = (form[GUEST_MINOR_PARENT_FIELD_KEYS.with] ?? '').trim().toLowerCase();
  if (!withWho || !GUEST_MINOR_WITH_OPTIONS.some((o) => o.value === withWho)) {
    return 'Kies met wie u komt (vader, moeder of allebei ouders).';
  }
  const t = (k: string) => (form[k] ?? '').trim();
  if (withWho === 'allebei_ouders') {
    if (!t(GUEST_MINOR_PARENT_FIELD_KEYS.fatherName)) return 'Vul de naam van uw vader in.';
    if (!t(GUEST_MINOR_PARENT_FIELD_KEYS.fatherPhone)) return 'Vul het GSM-nummer van uw vader in.';
    if (!t(GUEST_MINOR_PARENT_FIELD_KEYS.motherName)) return 'Vul de naam van uw moeder in.';
    if (!t(GUEST_MINOR_PARENT_FIELD_KEYS.motherPhone)) return 'Vul het GSM-nummer van uw moeder in.';
    return null;
  }
  if (!t(GUEST_MINOR_PARENT_FIELD_KEYS.name)) return 'Vul de naam van ouder of begeleider in.';
  if (!t(GUEST_MINOR_PARENT_FIELD_KEYS.phone)) return 'Vul het GSM-nummer van ouder of begeleider in.';
  return null;
}
