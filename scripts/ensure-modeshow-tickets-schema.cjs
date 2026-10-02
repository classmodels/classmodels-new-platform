'use strict';
/**
 * Zorgt dat Modeshow ticket-tabellen + drinks/sponsors/claims bestaan
 * (ook als prisma migrate faalde op Combell).
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

async function tryAlter(prisma, sql) {
  try {
    await prisma.$executeRawUnsafe(sql);
  } catch {
    /* kolom bestaat al of tabel ontbreekt (wordt elders aangemaakt) */
  }
}

async function ensureExtensions(prisma) {
  await tryAlter(prisma, `ALTER TABLE \`ModeshowEvent\` MODIFY \`coverImageUrl\` TEXT NULL`);
  await tryAlter(
    prisma,
    `ALTER TABLE \`ModeshowEvent\` ADD COLUMN \`priceDrinks\` DECIMAL(10, 2) NOT NULL DEFAULT 0`,
  );
  await tryAlter(prisma, `ALTER TABLE \`ModeshowEvent\` ADD COLUMN \`drinkTitle\` VARCHAR(191) NULL`);
  await tryAlter(prisma, `ALTER TABLE \`ModeshowEvent\` ADD COLUMN \`drinkDescription\` TEXT NULL`);
  await tryAlter(
    prisma,
    `ALTER TABLE \`ModeshowEvent\` ADD COLUMN \`drinkCouponsPerTicket\` INT NOT NULL DEFAULT 1`,
  );
  await tryAlter(prisma, `ALTER TABLE \`ModeshowEvent\` ADD COLUMN \`sponsorText\` TEXT NULL`);
  await tryAlter(prisma, `ALTER TABLE \`ModeshowEvent\` ADD COLUMN \`sponsorImageUrls\` JSON NULL`);
  await tryAlter(
    prisma,
    `ALTER TABLE \`ModeshowEvent\` ADD COLUMN \`claimEnabled\` BOOLEAN NOT NULL DEFAULT true`,
  );
  await tryAlter(
    prisma,
    `ALTER TABLE \`ModeshowEvent\` ADD COLUMN \`claimRequiredForCheckin\` BOOLEAN NOT NULL DEFAULT false`,
  );
  await tryAlter(prisma, `ALTER TABLE \`ModeshowEvent\` ADD COLUMN \`claimInfoText\` TEXT NULL`);
  await tryAlter(
    prisma,
    `ALTER TABLE \`ModeshowTicketOrder\` ADD COLUMN \`qtyDrinks\` INT NOT NULL DEFAULT 0`,
  );
  await tryAlter(
    prisma,
    `ALTER TABLE \`ModeshowTicketOrder\` ADD COLUMN \`unitPriceDrinks\` DECIMAL(10, 2) NOT NULL DEFAULT 0`,
  );

  if (!(await tableExists(prisma, 'ModeshowTicketClaim'))) {
    console.error('[combell] ModeshowTicketClaim ontbreekt — aanmaken…');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`ModeshowTicketClaim\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`eventId\` VARCHAR(191) NOT NULL,
        \`ticketId\` VARCHAR(191) NOT NULL,
        \`ticketCode\` VARCHAR(191) NOT NULL,
        \`firstName\` VARCHAR(191) NOT NULL,
        \`lastName\` VARCHAR(191) NOT NULL,
        \`email\` VARCHAR(191) NOT NULL,
        \`phone\` VARCHAR(191) NULL,
        \`archived\` BOOLEAN NOT NULL DEFAULT false,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    try {
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX \`ModeshowTicketClaim_ticketId_key\` ON \`ModeshowTicketClaim\`(\`ticketId\`)`,
      );
    } catch {
      /* ok */
    }
    try {
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX \`ModeshowTicketClaim_ticketCode_key\` ON \`ModeshowTicketClaim\`(\`ticketCode\`)`,
      );
    } catch {
      /* ok */
    }
    try {
      await prisma.$executeRawUnsafe(
        `CREATE INDEX \`ModeshowTicketClaim_eventId_idx\` ON \`ModeshowTicketClaim\`(\`eventId\`)`,
      );
    } catch {
      /* ok */
    }
  }
}

async function ensureModeshowTicketsSchema(prisma) {
  if (await tableExists(prisma, 'ModeshowEvent')) {
    console.error('[combell] ModeshowEvent bestaat al — extensies controleren…');
    await ensureExtensions(prisma);
    return true;
  }
  console.error('[combell] Modeshow ticket-tabellen ontbreken — aanmaken…');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE \`ModeshowEvent\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`slug\` VARCHAR(191) NOT NULL,
      \`title\` VARCHAR(191) NOT NULL,
      \`summary\` TEXT NULL,
      \`description\` TEXT NULL,
      \`eventDate\` DATE NOT NULL,
      \`doorsTime\` VARCHAR(8) NULL,
      \`startTime\` VARCHAR(8) NULL,
      \`venueName\` VARCHAR(191) NULL,
      \`street\` VARCHAR(191) NULL,
      \`streetNo\` VARCHAR(191) NULL,
      \`postcode\` VARCHAR(191) NULL,
      \`city\` VARCHAR(191) NULL,
      \`locationExtra\` VARCHAR(191) NULL,
      \`priceStd\` DECIMAL(10, 2) NOT NULL DEFAULT 0,
      \`priceVip\` DECIMAL(10, 2) NOT NULL DEFAULT 0,
      \`priceDrinks\` DECIMAL(10, 2) NOT NULL DEFAULT 0,
      \`drinkTitle\` VARCHAR(191) NULL,
      \`drinkDescription\` TEXT NULL,
      \`drinkCouponsPerTicket\` INT NOT NULL DEFAULT 1,
      \`ticketStock\` INT NULL,
      \`published\` BOOLEAN NOT NULL DEFAULT false,
      \`archived\` BOOLEAN NOT NULL DEFAULT false,
      \`coverImageUrl\` TEXT NULL,
      \`ticketFooter\` TEXT NULL,
      \`sponsorText\` TEXT NULL,
      \`sponsorImageUrls\` JSON NULL,
      \`claimEnabled\` BOOLEAN NOT NULL DEFAULT true,
      \`claimRequiredForCheckin\` BOOLEAN NOT NULL DEFAULT false,
      \`claimInfoText\` TEXT NULL,
      \`sortOrder\` INT NOT NULL DEFAULT 0,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX \`ModeshowEvent_slug_key\` ON \`ModeshowEvent\`(\`slug\`)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX \`ModeshowEvent_published_archived_eventDate_idx\` ON \`ModeshowEvent\`(\`published\`, \`archived\`, \`eventDate\`)`,
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE \`ModeshowTicketCoupon\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`eventId\` VARCHAR(191) NOT NULL,
      \`code\` VARCHAR(64) NOT NULL,
      \`ticketType\` VARCHAR(8) NOT NULL,
      \`maxQty\` INT NOT NULL DEFAULT 1,
      \`active\` BOOLEAN NOT NULL DEFAULT true,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX \`ModeshowTicketCoupon_eventId_code_idx\` ON \`ModeshowTicketCoupon\`(\`eventId\`, \`code\`)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX \`ModeshowTicketCoupon_eventId_code_ticketType_key\` ON \`ModeshowTicketCoupon\`(\`eventId\`, \`code\`, \`ticketType\`)`,
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE \`ModeshowTicketOrder\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`eventId\` VARCHAR(191) NOT NULL,
      \`orderKey\` VARCHAR(191) NOT NULL,
      \`status\` VARCHAR(191) NOT NULL DEFAULT 'pending',
      \`firstName\` VARCHAR(191) NOT NULL,
      \`lastName\` VARCHAR(191) NOT NULL,
      \`email\` VARCHAR(191) NOT NULL,
      \`phone\` VARCHAR(191) NULL,
      \`street\` VARCHAR(191) NULL,
      \`streetNo\` VARCHAR(191) NULL,
      \`postcode\` VARCHAR(191) NULL,
      \`city\` VARCHAR(191) NULL,
      \`qtyStd\` INT NOT NULL DEFAULT 0,
      \`qtyVip\` INT NOT NULL DEFAULT 0,
      \`qtyDrinks\` INT NOT NULL DEFAULT 0,
      \`unitPriceStd\` DECIMAL(10, 2) NOT NULL DEFAULT 0,
      \`unitPriceVip\` DECIMAL(10, 2) NOT NULL DEFAULT 0,
      \`unitPriceDrinks\` DECIMAL(10, 2) NOT NULL DEFAULT 0,
      \`subtotal\` DECIMAL(10, 2) NOT NULL DEFAULT 0,
      \`discountAmount\` DECIMAL(10, 2) NOT NULL DEFAULT 0,
      \`totalAmount\` DECIMAL(10, 2) NOT NULL DEFAULT 0,
      \`couponCode\` VARCHAR(191) NULL,
      \`couponTicketType\` VARCHAR(191) NULL,
      \`molliePaymentId\` VARCHAR(191) NULL,
      \`paymentStatus\` VARCHAR(191) NULL,
      \`paidAt\` DATETIME(3) NULL,
      \`ticketsEmailSentAt\` DATETIME(3) NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX \`ModeshowTicketOrder_orderKey_key\` ON \`ModeshowTicketOrder\`(\`orderKey\`)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX \`ModeshowTicketOrder_molliePaymentId_key\` ON \`ModeshowTicketOrder\`(\`molliePaymentId\`)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX \`ModeshowTicketOrder_eventId_status_idx\` ON \`ModeshowTicketOrder\`(\`eventId\`, \`status\`)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX \`ModeshowTicketOrder_email_idx\` ON \`ModeshowTicketOrder\`(\`email\`)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX \`ModeshowTicketOrder_createdAt_idx\` ON \`ModeshowTicketOrder\`(\`createdAt\`)`,
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE \`ModeshowTicket\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`orderId\` VARCHAR(191) NOT NULL,
      \`code\` VARCHAR(191) NOT NULL,
      \`ticketType\` VARCHAR(8) NOT NULL,
      \`label\` VARCHAR(191) NOT NULL,
      \`checkedIn\` BOOLEAN NOT NULL DEFAULT false,
      \`checkedInAt\` DATETIME(3) NULL,
      \`checkedInBy\` VARCHAR(191) NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX \`ModeshowTicket_code_key\` ON \`ModeshowTicket\`(\`code\`)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX \`ModeshowTicket_orderId_idx\` ON \`ModeshowTicket\`(\`orderId\`)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX \`ModeshowTicket_checkedIn_idx\` ON \`ModeshowTicket\`(\`checkedIn\`)`,
  );

  await ensureExtensions(prisma);

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`ModeshowTicketCoupon\`
      ADD CONSTRAINT \`ModeshowTicketCoupon_eventId_fkey\`
      FOREIGN KEY (\`eventId\`) REFERENCES \`ModeshowEvent\`(\`id\`)
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
  } catch (e) {
    console.error('[combell] ModeshowTicketCoupon FK (niet fataal):', e.message || e);
  }
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`ModeshowTicketOrder\`
      ADD CONSTRAINT \`ModeshowTicketOrder_eventId_fkey\`
      FOREIGN KEY (\`eventId\`) REFERENCES \`ModeshowEvent\`(\`id\`)
      ON DELETE RESTRICT ON UPDATE CASCADE
    `);
  } catch (e) {
    console.error('[combell] ModeshowTicketOrder FK (niet fataal):', e.message || e);
  }
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`ModeshowTicket\`
      ADD CONSTRAINT \`ModeshowTicket_orderId_fkey\`
      FOREIGN KEY (\`orderId\`) REFERENCES \`ModeshowTicketOrder\`(\`id\`)
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
  } catch (e) {
    console.error('[combell] ModeshowTicket FK (niet fataal):', e.message || e);
  }

  console.error('[combell] Modeshow ticket-tabellen OK');
  return true;
}

async function runEnsureModeshowTicketsSchema(root) {
  const PrismaClient = loadPrismaClient(root);
  const prisma = new PrismaClient();
  try {
    await ensureModeshowTicketsSchema(prisma);
    return true;
  } catch (e) {
    console.error('[combell] ensure Modeshow tickets mislukt:', e.message || e);
    return false;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

module.exports = { runEnsureModeshowTicketsSchema, ensureModeshowTicketsSchema };
