'use strict';
/**
 * Zorgt dat try-out coupon-tabellen/kolommen bestaan, ook als prisma migrate faalde op Combell.
 * Zonder dit: GET /portal/model/tryout-modeshow → 500 (onbekende kolommen isFree/couponId/…).
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

async function tableExists(prisma, table) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT TABLE_NAME AS name
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    table,
  );
  return rows.length > 0;
}

async function columnNames(prisma, table) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COLUMN_NAME AS name
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    table,
  );
  return new Set(rows.map((r) => String(r.name)));
}

async function indexExists(prisma, table, indexName) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT INDEX_NAME AS name
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    table,
    indexName,
  );
  return rows.length > 0;
}

async function fkExists(prisma, table, constraintName) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT CONSTRAINT_NAME AS name
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       AND CONSTRAINT_TYPE = 'FOREIGN KEY' AND CONSTRAINT_NAME = ?`,
    table,
    constraintName,
  );
  return rows.length > 0;
}

async function ensureTryoutCouponsSchema(prisma) {
  if (!(await tableExists(prisma, 'TryoutCoupon'))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`TryoutCoupon\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`code\` VARCHAR(191) NOT NULL,
        \`discountType\` VARCHAR(191) NOT NULL,
        \`discountValue\` DECIMAL(10, 2) NOT NULL,
        \`maxTotalUses\` INTEGER NULL,
        \`maxUsesPerUser\` INTEGER NOT NULL DEFAULT 1,
        \`usedCount\` INTEGER NOT NULL DEFAULT 0,
        \`active\` BOOLEAN NOT NULL DEFAULT true,
        \`editionSlug\` VARCHAR(191) NULL,
        \`note\` VARCHAR(191) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        UNIQUE INDEX \`TryoutCoupon_code_key\`(\`code\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.error('[combell] TryoutCoupon tabel aangemaakt');
  }

  if (await tableExists(prisma, 'TryoutModeshowRegistration')) {
    const cols = await columnNames(prisma, 'TryoutModeshowRegistration');
    const adds = [
      ['listPrice', 'ADD COLUMN `listPrice` DECIMAL(10, 2) NULL'],
      ['discountAmount', 'ADD COLUMN `discountAmount` DECIMAL(10, 2) NULL'],
      ['isFree', 'ADD COLUMN `isFree` BOOLEAN NOT NULL DEFAULT false'],
      ['couponId', 'ADD COLUMN `couponId` VARCHAR(191) NULL'],
      ['couponCode', 'ADD COLUMN `couponCode` VARCHAR(191) NULL'],
      ['declineReason', 'ADD COLUMN `declineReason` VARCHAR(500) NULL'],
    ];
    for (const [name, sql] of adds) {
      if (!cols.has(name)) {
        await prisma.$executeRawUnsafe(`ALTER TABLE \`TryoutModeshowRegistration\` ${sql}`);
        console.error(`[combell] TryoutModeshowRegistration.${name} toegevoegd`);
      }
    }

    if (!(await indexExists(prisma, 'TryoutModeshowRegistration', 'TryoutModeshowRegistration_couponId_idx'))) {
      await prisma.$executeRawUnsafe(
        'CREATE INDEX `TryoutModeshowRegistration_couponId_idx` ON `TryoutModeshowRegistration`(`couponId`)',
      );
    }

    if (!(await fkExists(prisma, 'TryoutModeshowRegistration', 'TryoutModeshowRegistration_couponId_fkey'))) {
      try {
        await prisma.$executeRawUnsafe(
          'ALTER TABLE `TryoutModeshowRegistration` ADD CONSTRAINT `TryoutModeshowRegistration_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `TryoutCoupon`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
        );
      } catch (e) {
        console.error('[combell] FK TryoutModeshowRegistration.couponId overgeslagen:', e.message || e);
      }
    }
  }

  if (!(await tableExists(prisma, 'TryoutCouponRedemption'))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`TryoutCouponRedemption\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`couponId\` VARCHAR(191) NOT NULL,
        \`userId\` VARCHAR(191) NOT NULL,
        \`registrationId\` VARCHAR(191) NOT NULL,
        \`amountBefore\` DECIMAL(10, 2) NOT NULL,
        \`amountAfter\` DECIMAL(10, 2) NOT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        UNIQUE INDEX \`TryoutCouponRedemption_registrationId_key\`(\`registrationId\`),
        INDEX \`TryoutCouponRedemption_couponId_userId_idx\`(\`couponId\`, \`userId\`),
        INDEX \`TryoutCouponRedemption_userId_idx\`(\`userId\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.error('[combell] TryoutCouponRedemption tabel aangemaakt');
  }

  if (await tableExists(prisma, 'TryoutCouponRedemption')) {
    if (!(await fkExists(prisma, 'TryoutCouponRedemption', 'TryoutCouponRedemption_couponId_fkey'))) {
      try {
        await prisma.$executeRawUnsafe(
          'ALTER TABLE `TryoutCouponRedemption` ADD CONSTRAINT `TryoutCouponRedemption_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `TryoutCoupon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
        );
      } catch (e) {
        console.error('[combell] FK TryoutCouponRedemption.couponId overgeslagen:', e.message || e);
      }
    }
    if (!(await fkExists(prisma, 'TryoutCouponRedemption', 'TryoutCouponRedemption_userId_fkey'))) {
      try {
        await prisma.$executeRawUnsafe(
          'ALTER TABLE `TryoutCouponRedemption` ADD CONSTRAINT `TryoutCouponRedemption_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
        );
      } catch (e) {
        console.error('[combell] FK TryoutCouponRedemption.userId overgeslagen:', e.message || e);
      }
    }
    if (!(await fkExists(prisma, 'TryoutCouponRedemption', 'TryoutCouponRedemption_registrationId_fkey'))) {
      try {
        await prisma.$executeRawUnsafe(
          'ALTER TABLE `TryoutCouponRedemption` ADD CONSTRAINT `TryoutCouponRedemption_registrationId_fkey` FOREIGN KEY (`registrationId`) REFERENCES `TryoutModeshowRegistration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
        );
      } catch (e) {
        console.error('[combell] FK TryoutCouponRedemption.registrationId overgeslagen:', e.message || e);
      }
    }
  }
}

async function runEnsureTryoutCouponsSchema(root) {
  if (!process.env.DB_URL?.trim() && !process.env.DATABASE_URL?.trim()) {
    console.error('[combell] tryout-coupons ensure overgeslagen: DB_URL ontbreekt');
    return false;
  }
  let PrismaClient;
  try {
    PrismaClient = loadPrismaClient(root);
  } catch (e) {
    console.error('[combell] tryout-coupons ensure: Prisma client niet geladen:', e.message || e);
    return false;
  }
  const prisma = new PrismaClient();
  try {
    await ensureTryoutCouponsSchema(prisma);
    console.error('[combell] Tryout-coupons-schema OK');
    return true;
  } catch (e) {
    console.error('[combell] Tryout-coupons-schema ensure MISLUKT:', e.message || e);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { ensureTryoutCouponsSchema, runEnsureTryoutCouponsSchema };
