/**
 * Eénmalig op productie: npx ts-node -r tsconfig-paths/register src/scripts/seed-legacy-reviews-cli.ts
 * Of na deploy: npm run seed (bevat legacy reviews).
 */
import { PrismaClient } from '@prisma/client';
import { seedLegacyReviews } from '../reviews/seed-legacy-reviews';

async function main() {
  const prisma = new PrismaClient();
  const r = await seedLegacyReviews(prisma);
  console.log(r);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
