import type { PrismaClient } from '@prisma/client';
import { LEGACY_REVIEWS } from '../data/legacy-reviews';

/** Eénmalig: vult reviews van de oude site (idempotent via sortOrder-bereik). */
export async function seedLegacyReviews(prisma: PrismaClient) {
  const marker = await prisma.review.count({
    where: { sortOrder: { gte: 100, lte: 8999 } },
  });
  if (marker >= LEGACY_REVIEWS.length) return { inserted: 0, skipped: true };

  let order = 100;
  let inserted = 0;
  for (const r of LEGACY_REVIEWS) {
    const exists = await prisma.review.findFirst({
      where: { title: r.title, body: r.body, authorName: r.authorName ?? null },
    });
    if (exists) continue;
    await prisma.review.create({
      data: {
        title: r.title,
        body: r.body,
        authorName: r.authorName,
        rating: r.rating,
        sortOrder: order++,
        approved: true,
        visible: true,
      },
    });
    inserted++;
  }
  return { inserted, skipped: false };
}
