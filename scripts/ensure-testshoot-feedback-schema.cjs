'use strict';
/**
 * Zorgt dat TestshootFeedback de kolommen archived/modelName heeft
 * (en modelId nullable met ON DELETE SET NULL), ook als prisma migrate faalde.
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

async function ensureTestshootFeedbackSchema(prisma) {
  const colRows = await prisma.$queryRawUnsafe(
    `SELECT COLUMN_NAME AS name, IS_NULLABLE AS nullable
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TestshootFeedback'`,
  );
  const byName = new Map(colRows.map((r) => [String(r.name), r]));

  if (!byName.has('archived')) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `TestshootFeedback` ADD COLUMN `archived` BOOLEAN NOT NULL DEFAULT false',
    );
    console.error('[combell] TestshootFeedback.archived toegevoegd');
  }
  if (!byName.has('modelName')) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `TestshootFeedback` ADD COLUMN `modelName` VARCHAR(191) NULL',
    );
    console.error('[combell] TestshootFeedback.modelName toegevoegd');
  }

  const modelId = byName.get('modelId');
  if (modelId && String(modelId.nullable).toUpperCase() === 'NO') {
    const fks = await prisma.$queryRawUnsafe(
      `SELECT CONSTRAINT_NAME AS name
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TestshootFeedback'
         AND COLUMN_NAME = 'modelId' AND REFERENCED_TABLE_NAME IS NOT NULL`,
    );
    for (const fk of fks) {
      const name = String(fk.name);
      await prisma.$executeRawUnsafe(
        `ALTER TABLE \`TestshootFeedback\` DROP FOREIGN KEY \`${name}\``,
      );
    }
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `TestshootFeedback` MODIFY `modelId` VARCHAR(191) NULL',
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `TestshootFeedback` ADD CONSTRAINT `TestshootFeedback_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `TestshootModel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
    );
    console.error('[combell] TestshootFeedback.modelId → nullable + SET NULL');
  }

  await prisma.$executeRawUnsafe(
    `UPDATE \`TestshootFeedback\` f
     LEFT JOIN \`TestshootModel\` m ON m.\`id\` = f.\`modelId\`
     SET f.\`modelName\` = m.\`name\`
     WHERE f.\`modelName\` IS NULL AND m.\`name\` IS NOT NULL`,
  );
}

async function runEnsureTestshootFeedbackSchema(root) {
  if (!process.env.DB_URL?.trim() && !process.env.DATABASE_URL?.trim()) {
    console.error('[combell] testshoot-schema ensure overgeslagen: DB_URL ontbreekt');
    return false;
  }
  let PrismaClient;
  try {
    PrismaClient = loadPrismaClient(root);
  } catch (e) {
    console.error('[combell] testshoot-schema ensure: Prisma client niet geladen:', e.message || e);
    return false;
  }
  const prisma = new PrismaClient();
  try {
    await ensureTestshootFeedbackSchema(prisma);
    console.error('[combell] TestshootFeedback-schema OK');
    return true;
  } catch (e) {
    console.error('[combell] TestshootFeedback-schema ensure MISLUKT:', e.message || e);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { ensureTestshootFeedbackSchema, runEnsureTestshootFeedbackSchema };
