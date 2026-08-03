import type { PrismaClient } from '@prisma/client';
import { LEGACY_REVIEWS } from '../data/legacy-reviews';

/** Oude merknamen in reviewteksten → Class-Models. */
const STREET_MODELS_RE = /street[\s_-]*models?/gi;

export function rebrandStreetModelsText(text: string): string {
  return text.replace(STREET_MODELS_RE, 'Class-Models');
}

function needsStreetModelsRebrand(text: string): boolean {
  return /street[\s_-]*models?/i.test(text);
}

/** Past bestaande reviews in de DB aan (live + seed). Idempotent. */
export async function rebrandStreetModelsInReviews(prisma: PrismaClient) {
  const rows = await prisma.review.findMany({
    select: { id: true, title: true, body: true },
  });

  let updated = 0;
  for (const row of rows) {
    if (!needsStreetModelsRebrand(row.title) && !needsStreetModelsRebrand(row.body)) {
      continue;
    }
    await prisma.review.update({
      where: { id: row.id },
      data: {
        title: rebrandStreetModelsText(row.title),
        body: rebrandStreetModelsText(row.body),
      },
    });
    updated++;
  }
  return { updated };
}

/** Verwijdert de oude seed-demo-review (“Demo klant”). Idempotent. */
export async function removeDemoReviews(prisma: PrismaClient) {
  const result = await prisma.review.deleteMany({
    where: {
      OR: [
        { authorName: 'Demo klant' },
        {
          title: 'Professioneel platform',
          body: { contains: 'Class Models combineert een strakke site' },
        },
      ],
    },
  });
  return { deleted: result.count };
}

/** Eénmalig: vult reviews van de oude site (idempotent via sortOrder-bereik). */
export async function seedLegacyReviews(prisma: PrismaClient) {
  const rebrand = await rebrandStreetModelsInReviews(prisma);

  const marker = await prisma.review.count({
    where: { sortOrder: { gte: 100, lte: 8999 } },
  });
  if (marker >= LEGACY_REVIEWS.length) {
    return { inserted: 0, skipped: true, rebranded: rebrand.updated };
  }

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
  return { inserted, skipped: false, rebranded: rebrand.updated };
}
