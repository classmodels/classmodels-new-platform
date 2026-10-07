/** Actieve try-out editie — inschrijvingen zijn per `editionSlug` gescheiden. */
export const TRYOUT_MODESHOW_ACTIVE_SLUG = 'tryout-2027-03-27';

/** Oude slug(s) met bestaande inschrijvingen — worden bij laden naar de actieve slug gezet. */
export const TRYOUT_MODESHOW_LEGACY_SLUGS = ['tryout-2026-10-31'] as const;

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

type PrismaLike = {
  tryoutModeshowRegistration: {
    updateMany: (args: {
      where: { editionSlug: { in: string[] } };
      data: { editionSlug: string };
    }) => Promise<unknown>;
  };
  tryoutCoupon: {
    updateMany: (args: {
      where: { editionSlug: { in: string[] } };
      data: { editionSlug: string };
    }) => Promise<unknown>;
  };
};

/** Verplaatst inschrijvingen/coupons van oude editie-slug naar de actieve (idempotent). */
export async function migrateTryoutEditionSlugs(prisma: PrismaLike) {
  const legacy = [...TRYOUT_MODESHOW_LEGACY_SLUGS];
  if (!legacy.length) return;
  await prisma.tryoutModeshowRegistration.updateMany({
    where: { editionSlug: { in: legacy } },
    data: { editionSlug: TRYOUT_MODESHOW_ACTIVE_SLUG },
  });
  await prisma.tryoutCoupon.updateMany({
    where: { editionSlug: { in: legacy } },
    data: { editionSlug: TRYOUT_MODESHOW_ACTIVE_SLUG },
  });
}
