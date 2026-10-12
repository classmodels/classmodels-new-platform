'use strict';
/**
 * Zorgt dat OpenModellendagRegistration bestaat (ook als prisma migrate faalde op Combell).
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

const ARCHIVE_KEY = '2026-10-11';

async function parkExistingRows(prisma) {
  const result = await prisma.$executeRawUnsafe(
    "UPDATE `OpenModellendagRegistration` SET `parkKey` = ? WHERE `parkKey` = '' AND `createdAt` < '2026-10-13 00:00:00'",
    ARCHIVE_KEY,
  );
  console.error(`[combell] Open Modellendag geparkeerd (${ARCHIVE_KEY}), rijen bijgewerkt: ${result}`);
}

async function runEnsureOpenModellendagSchema(root) {
  const PrismaClient = loadPrismaClient(root);
  const prisma = new PrismaClient();
  try {
    if (await tableExists(prisma, 'OpenModellendagRegistration')) {
      const cols = await columnNames(prisma, 'OpenModellendagRegistration');
      if (!cols.has('parkKey')) {
        console.error('[combell] Open Modellendag parkeren — kolom parkKey ontbreekt');
        await prisma.$executeRawUnsafe(
          "ALTER TABLE `OpenModellendagRegistration` ADD COLUMN `parkKey` VARCHAR(32) NOT NULL DEFAULT ''",
        );
        if (await indexExists(prisma, 'OpenModellendagRegistration', 'OpenModellendagRegistration_email_key')) {
          await prisma.$executeRawUnsafe(
            'DROP INDEX `OpenModellendagRegistration_email_key` ON `OpenModellendagRegistration`',
          );
        }
        if (!(await indexExists(prisma, 'OpenModellendagRegistration', 'OpenModellendagRegistration_email_parkKey_key'))) {
          await prisma.$executeRawUnsafe(
            'CREATE UNIQUE INDEX `OpenModellendagRegistration_email_parkKey_key` ON `OpenModellendagRegistration`(`email`, `parkKey`)',
          );
        }
        if (!(await indexExists(prisma, 'OpenModellendagRegistration', 'OpenModellendagRegistration_parkKey_idx'))) {
          await prisma.$executeRawUnsafe(
            'CREATE INDEX `OpenModellendagRegistration_parkKey_idx` ON `OpenModellendagRegistration`(`parkKey`)',
          );
        }
      }
      await parkExistingRows(prisma);
      console.error('[combell] OpenModellendagRegistration OK');
      return true;
    }
    console.error('[combell] OpenModellendagRegistration ontbreekt — aanmaken…');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`OpenModellendagRegistration\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`name\` VARCHAR(120) NOT NULL,
        \`email\` VARCHAR(200) NOT NULL,
        \`phone\` VARCHAR(40) NOT NULL,
        \`age\` INT NOT NULL,
        \`timeSlot\` VARCHAR(8) NOT NULL,
        \`ageGroup\` VARCHAR(16) NOT NULL,
        \`parkKey\` VARCHAR(32) NOT NULL DEFAULT '',
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        UNIQUE INDEX \`OpenModellendagRegistration_email_parkKey_key\`(\`email\`, \`parkKey\`),
        INDEX \`OpenModellendagRegistration_timeSlot_idx\`(\`timeSlot\`),
        INDEX \`OpenModellendagRegistration_ageGroup_idx\`(\`ageGroup\`),
        INDEX \`OpenModellendagRegistration_parkKey_idx\`(\`parkKey\`),
        INDEX \`OpenModellendagRegistration_createdAt_idx\`(\`createdAt\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.error('[combell] OpenModellendagRegistration aangemaakt');
    return true;
  } catch (e) {
    console.error('[combell] ensure OpenModellendagRegistration mislukt:', e?.message || e);
    return false;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

module.exports = { runEnsureOpenModellendagSchema };

if (require.main === module) {
  const root = path.join(__dirname, '..');
  runEnsureOpenModellendagSchema(root).then((ok) => process.exit(ok ? 0 : 1));
}
