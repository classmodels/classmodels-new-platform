/** Actieve try-out editie — inschrijvingen zijn per `editionSlug` gescheiden. */
export const TRYOUT_MODESHOW_ACTIVE_SLUG = 'tryout-2027-03-27';

/** Oude slug(s) met bestaande inschrijvingen — blijven zichtbaar en worden samengevoegd. */
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

/** Slugs die bij de huidige try-out horen (actief + legacy). */
export function tryoutEditionQuerySlugs(requestedRaw?: string | null): string[] {
  const requested = requestedRaw?.trim() || TRYOUT_MODESHOW_ACTIVE_SLUG;
  const legacy = [...TRYOUT_MODESHOW_LEGACY_SLUGS];
  if (
    requested === TRYOUT_MODESHOW_ACTIVE_SLUG ||
    legacy.includes(requested as (typeof TRYOUT_MODESHOW_LEGACY_SLUGS)[number])
  ) {
    return [TRYOUT_MODESHOW_ACTIVE_SLUG, ...legacy];
  }
  return [requested];
}

type RegRow = {
  id: string;
  userId: string;
  editionSlug: string;
  interestStatus: string;
  termsAcceptedAt: Date | null;
  paymentStatus: string | null;
  amount: unknown;
  listPrice: unknown;
  discountAmount: unknown;
  isFree: boolean;
  couponId: string | null;
  couponCode: string | null;
  molliePaymentId: string | null;
  declineReason: string | null;
};

type PrismaLike = {
  tryoutModeshowRegistration: {
    findMany: (args: { where: { editionSlug: { in: string[] } } }) => Promise<RegRow[]>;
    findUnique: (args: {
      where: { userId_editionSlug: { userId: string; editionSlug: string } };
    }) => Promise<RegRow | null>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
    delete: (args: { where: { id: string } }) => Promise<unknown>;
  };
  tryoutCoupon: {
    updateMany: (args: {
      where: { editionSlug: { in: string[] } };
      data: { editionSlug: string };
    }) => Promise<unknown>;
  };
};

function statusRank(status: string): number {
  if (status === 'paid') return 4;
  if (status === 'interested') return 3;
  if (status === 'declined') return 2;
  return 1;
}

/**
 * Verplaatst legacy-inschrijvingen naar de actieve slug.
 * Bij conflict (zelfde user al op actieve slug): behoud de “sterkste” status, wis de andere rij.
 */
export async function migrateTryoutEditionSlugs(prisma: PrismaLike) {
  const legacy = [...TRYOUT_MODESHOW_LEGACY_SLUGS];
  if (!legacy.length) return;

  const legacyRows = await prisma.tryoutModeshowRegistration.findMany({
    where: { editionSlug: { in: legacy } },
  });

  for (const row of legacyRows) {
    const existing = await prisma.tryoutModeshowRegistration.findUnique({
      where: {
        userId_editionSlug: { userId: row.userId, editionSlug: TRYOUT_MODESHOW_ACTIVE_SLUG },
      },
    });

    if (!existing) {
      await prisma.tryoutModeshowRegistration.update({
        where: { id: row.id },
        data: { editionSlug: TRYOUT_MODESHOW_ACTIVE_SLUG },
      });
      continue;
    }

    const keepLegacy = statusRank(row.interestStatus) > statusRank(existing.interestStatus);
    const winner = keepLegacy ? row : existing;
    const loserId = keepLegacy ? existing.id : row.id;

    if (keepLegacy) {
      await prisma.tryoutModeshowRegistration.update({
        where: { id: existing.id },
        data: {
          interestStatus: winner.interestStatus,
          declineReason: winner.declineReason,
          termsAcceptedAt: winner.termsAcceptedAt,
          molliePaymentId: winner.molliePaymentId,
          paymentStatus: winner.paymentStatus,
          amount: winner.amount,
          listPrice: winner.listPrice,
          discountAmount: winner.discountAmount,
          isFree: winner.isFree,
          couponId: winner.couponId,
          couponCode: winner.couponCode,
        },
      });
    }
    await prisma.tryoutModeshowRegistration.delete({ where: { id: loserId } });
  }

  await prisma.tryoutCoupon.updateMany({
    where: { editionSlug: { in: legacy } },
    data: { editionSlug: TRYOUT_MODESHOW_ACTIVE_SLUG },
  });
}
