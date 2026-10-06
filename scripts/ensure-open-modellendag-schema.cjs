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

async function runEnsureOpenModellendagSchema(root) {
  const PrismaClient = loadPrismaClient(root);
  const prisma = new PrismaClient();
  try {
    if (await tableExists(prisma, 'OpenModellendagRegistration')) {
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
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        UNIQUE INDEX \`OpenModellendagRegistration_email_key\`(\`email\`),
        INDEX \`OpenModellendagRegistration_timeSlot_idx\`(\`timeSlot\`),
        INDEX \`OpenModellendagRegistration_ageGroup_idx\`(\`ageGroup\`),
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
