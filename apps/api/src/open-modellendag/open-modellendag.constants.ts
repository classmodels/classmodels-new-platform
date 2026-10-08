export const OPEN_MODELLENDAG_SLOTS = ['11:00', '13:00', '15:00', '17:00'] as const;
export type OpenModellendagSlot = (typeof OPEN_MODELLENDAG_SLOTS)[number];

/** Volle starturen — zichtbaar op de site, niet meer boekenbaar. */
export const OPEN_MODELLENDAG_FULL_SLOTS: readonly OpenModellendagSlot[] = ['15:00'];

export function isOpenModellendagSlotFull(slot: string): boolean {
  return (OPEN_MODELLENDAG_FULL_SLOTS as readonly string[]).includes(slot);
}

export const OPEN_MODELLENDAG_DATE_LABEL = 'zondag 11 oktober';
export const OPEN_MODELLENDAG_VENUE = 'Provinciebaan 3, 2235 Hulshout';

export function ageGroupFromAge(age: number): string {
  if (age >= 6 && age <= 12) return '6-12';
  if (age >= 13 && age <= 17) return '13-17';
  if (age >= 18 && age <= 45) return '18-45';
  if (age >= 46) return '45-60+';
  return 'onbekend';
}
