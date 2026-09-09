'use strict';
/**
 * Zorgt dat ModelBriefResponse.profileMatched bestaat, ook als prisma migrate faalde.
 * Zonder deze kolom → /portal/model/briefs → 500 → lege opdrachtenlijst in het portaal.
 */
const fs = require('fs');
const path = require('path');

function loadPrismaClient(root) {
  const apiDir = path.join(root, 'apps', 'api');
  const clientPkg = path.join(apiDir, 'node_modules', '@prisma', 'client');
  const fallback = path.join(root, 'node_modules', '@prisma', 'client');
  const mod = require(fs.existsSync(clientPkg) ? clientPkg : fallback);
  return mod.PrismaClient;
}

async function ensureBriefProfileMatchedSchema(prisma) {
  const cols = await prisma.$queryRawUnsafe(
    `SELECT COLUMN_NAME AS name
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'ModelBriefResponse'
       AND COLUMN_NAME = 'profileMatched'`,
  );
  if (!cols.length) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `ModelBriefResponse` ADD COLUMN `profileMatched` BOOLEAN NOT NULL DEFAULT true',
    );
    console.error('[combell] ModelBriefResponse.profileMatched toegevoegd (opdrachten-fix)');
  }
}

async function runEnsureBriefProfileMatchedSchema(root) {
  if (!process.env.DB_URL?.trim() && !process.env.DATABASE_URL?.trim()) {
    console.error('[combell] brief profileMatched ensure overgeslagen: DB_URL ontbreekt');
    return false;
  }
  let PrismaClient;
  try {
    PrismaClient = loadPrismaClient(root);
  } catch (e) {
    console.error('[combell] brief profileMatched ensure: Prisma client niet geladen:', e.message || e);
    return false;
  }
  const prisma = new PrismaClient();
  try {
    await ensureBriefProfileMatchedSchema(prisma);
    return true;
  } catch (e) {
    console.error('[combell] brief profileMatched ensure MISLUKT:', e.message || e);
    return false;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

module.exports = { runEnsureBriefProfileMatchedSchema, ensureBriefProfileMatchedSchema };
