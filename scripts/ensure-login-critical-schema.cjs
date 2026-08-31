'use strict';
/**
 * Zorgt dat login/partners werken, ook als prisma migrate faalde:
 * - User.clientProfile (anders elke User-query → 500)
 * - PartnerLogo-tabel
 * - Role.catalogVisibility (anders Role-include bij login → 500)
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

async function ensureLoginCriticalSchema(prisma) {
  const userCols = await prisma.$queryRawUnsafe(
    `SELECT COLUMN_NAME AS name
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'User'`,
  );
  const userNames = new Set(userCols.map((r) => String(r.name)));
  if (!userNames.has('clientProfile')) {
    await prisma.$executeRawUnsafe('ALTER TABLE `User` ADD COLUMN `clientProfile` JSON NULL');
    console.error('[combell] User.clientProfile toegevoegd (login-fix)');
  }

  const tables = await prisma.$queryRawUnsafe(
    `SELECT TABLE_NAME AS name
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PartnerLogo'`,
  );
  if (!tables.length) {
    await prisma.$executeRawUnsafe(`
CREATE TABLE \`PartnerLogo\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`name\` VARCHAR(191) NOT NULL,
    \`websiteUrl\` VARCHAR(191) NULL,
    \`imagePath\` VARCHAR(191) NOT NULL,
    \`sortOrder\` INTEGER NOT NULL DEFAULT 0,
    \`visible\` BOOLEAN NOT NULL DEFAULT true,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    INDEX \`PartnerLogo_visible_sortOrder_idx\`(\`visible\`, \`sortOrder\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.error('[combell] PartnerLogo-tabel aangemaakt');
  }

  const roleCols = await prisma.$queryRawUnsafe(
    `SELECT COLUMN_NAME AS name
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Role' AND COLUMN_NAME = 'catalogVisibility'`,
  );
  if (!roleCols.length) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `Role` ADD COLUMN `catalogVisibility` VARCHAR(32) NOT NULL DEFAULT 'admin_frontend'",
    );
    await prisma.$executeRawUnsafe(
      "UPDATE `Role` SET `catalogVisibility` = 'public' WHERE `slug` IN ('newface', 'tryout', 'high-class')",
    );
    await prisma.$executeRawUnsafe(
      "UPDATE `Role` SET `catalogVisibility` = 'admin_frontend' WHERE `slug` = 'inactief'",
    );
    console.error('[combell] Role.catalogVisibility toegevoegd (login/fiche-fix)');
  }
}

async function runEnsureLoginCriticalSchema(root) {
  if (!process.env.DB_URL?.trim() && !process.env.DATABASE_URL?.trim()) {
    console.error('[combell] login-schema ensure overgeslagen: DB_URL ontbreekt');
    return false;
  }
  let PrismaClient;
  try {
    PrismaClient = loadPrismaClient(root);
  } catch (e) {
    console.error('[combell] login-schema ensure: Prisma client niet geladen:', e.message || e);
    return false;
  }
  const prisma = new PrismaClient();
  try {
    await ensureLoginCriticalSchema(prisma);
    return true;
  } catch (e) {
    console.error('[combell] login-schema ensure MISLUKT:', e.message || e);
    return false;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

module.exports = { runEnsureLoginCriticalSchema, ensureLoginCriticalSchema };
