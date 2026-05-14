/** Actieve try-out editie — inschrijvingen zijn per `editionSlug` gescheiden. */
export const TRYOUT_MODESHOW_ACTIVE_SLUG = 'tryout-2026-10-31';

export const TRYOUT_MODESHOW_EDITION = {
  slug: TRYOUT_MODESHOW_ACTIVE_SLUG,
  title: 'Try-out modeshow',
  /** ISO datum voor event (zaterdag 31 oktober 2026) */
  eventDate: '2026-10-31',
  dateLabelNl: 'zaterdag 31 oktober 2026',
  venueName: 'Hangar 604',
  addressLine: 'Mechelsebaan 604',
  postalCode: '2580',
  city: 'Putte',
  doorsTimeNl: '19.00 uur',
  showTimeNl: '20.00 uur',
} as const;
