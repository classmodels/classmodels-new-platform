'use strict';
/**
 * Zorgt dat PortfolioDeliveryAck bestaat, ook als prisma migrate faalde op Combell.
 * Zonder dit: GET /admin/portfolio-delivery → 500.
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

async function ensurePortfolioDeliveryAckSchema(prisma) {
  if (await tableExists(prisma, 'PortfolioDeliveryAck')) {
    console.error('[combell] PortfolioDeliveryAck bestaat al');
    return true;
  }
  console.error('[combell] PortfolioDeliveryAck ontbreekt — tabel aanmaken…');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE \`PortfolioDeliveryAck\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`modelUserId\` VARCHAR(191) NOT NULL,
      \`downloadedAt\` DATETIME(3) NOT NULL,
      \`fileCount\` INTEGER NOT NULL DEFAULT 0,
      \`shootDate\` VARCHAR(191) NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX \`PortfolioDeliveryAck_modelUserId_key\` ON \`PortfolioDeliveryAck\`(\`modelUserId\`)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX \`PortfolioDeliveryAck_shootDate_idx\` ON \`PortfolioDeliveryAck\`(\`shootDate\`)`,
  );
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`PortfolioDeliveryAck\`
      ADD CONSTRAINT \`PortfolioDeliveryAck_modelUserId_fkey\`
      FOREIGN KEY (\`modelUserId\`) REFERENCES \`User\`(\`id\`)
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
  } catch (e) {
    console.error('[combell] PortfolioDeliveryAck FK (niet fataal):', e.message || e);
  }
  console.error('[combell] PortfolioDeliveryAck OK');
  return true;
}

async function runEnsurePortfolioDeliveryAckSchema(root) {
  const PrismaClient = loadPrismaClient(root);
  const prisma = new PrismaClient();
  try {
    await ensurePortfolioDeliveryAckSchema(prisma);
    return true;
  } catch (e) {
    console.error('[combell] ensure PortfolioDeliveryAck mislukt:', e.message || e);
    return false;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

module.exports = { runEnsurePortfolioDeliveryAckSchema, ensurePortfolioDeliveryAckSchema };

if (require.main === module) {
  const root = path.join(__dirname, '..');
  runEnsurePortfolioDeliveryAckSchema(root).then((ok) => process.exit(ok ? 0 : 1));
}
