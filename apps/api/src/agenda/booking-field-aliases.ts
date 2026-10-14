/** Zelfde persoonsgegeven onder verschillende veldnamen (familienaam / achternaam, straat / adres, …). */

const ALIAS_GROUPS: readonly (readonly string[])[] = [
  ['voornaam', 'firstname'],
  ['familienaam', 'achternaam', 'lastname'],
  ['email', 'e-mail'],
  ['telefoon', 'gsm', 'phone'],
  ['straat', 'adres', 'address', 'straatnaam', 'street'],
  ['nr', 'huisnummer', 'huisnr', 'number'],
  ['postcode', 'zip', 'post_code'],
  ['gemeente', 'plaats', 'woonplaats', 'city'],
  ['land', 'country'],
  ['geboortedatum', 'birthdate', 'birth_date'],
];

function groupFor(fieldKey: string): readonly string[] | null {
  const k = fieldKey.trim().toLowerCase();
  return ALIAS_GROUPS.find((g) => g.includes(k)) ?? null;
}

export function firstFilledBookingField(
  fields: Record<string, string>,
  keys: readonly string[],
): string {
  for (const k of keys) {
    const v = (fields[k] ?? '').trim();
    if (v) return v;
  }
  return '';
}

/**
 * Vul lege sleutels die de agenda wél kent met de waarde uit een alias.
 * Maakt geen extra sleutels aan buiten `keysToFill`.
 */
export function syncBookingFieldAliases(
  fields: Record<string, string>,
  keysToFill: readonly string[],
): void {
  for (const key of keysToFill) {
    if ((fields[key] ?? '').trim()) continue;
    const group = groupFor(key);
    if (!group) continue;
    const val = firstFilledBookingField(fields, group);
    if (val) fields[key] = val;
  }
}
