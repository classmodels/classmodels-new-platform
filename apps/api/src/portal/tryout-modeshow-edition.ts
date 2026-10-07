/** Actieve try-out editie — inschrijvingen zijn per `editionSlug` gescheiden. */
export const TRYOUT_MODESHOW_ACTIVE_SLUG = 'tryout-2027-03-27';

export const TRYOUT_MODESHOW_EDITION = {
  slug: TRYOUT_MODESHOW_ACTIVE_SLUG,
  title: 'Try-out modeshow',
  /** ISO datum voor event (zaterdag 27 maart 2027) */
  eventDate: '2027-03-27',
  dateLabelNl: 'zaterdag 27 maart 2027',
  venueName: 'Stadsfeestzaal Aarschot',
  addressLine: 'Demervallei 14',
  postalCode: '3200',
  city: 'Aarschot',
  doorsTimeNl: '19.00 uur',
  showTimeNl: '20.00 uur',
} as const;
