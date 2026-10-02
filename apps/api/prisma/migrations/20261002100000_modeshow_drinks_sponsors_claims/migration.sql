-- Modeshow tickets: drankbonnen, sponsors, QR-claims (idempotent)

SET @db := DATABASE();

-- ModeshowEvent columns
SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ModeshowEvent' AND COLUMN_NAME='priceDrinks')=0,
    'ALTER TABLE `ModeshowEvent` ADD COLUMN `priceDrinks` DECIMAL(10, 2) NOT NULL DEFAULT 0',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ModeshowEvent' AND COLUMN_NAME='drinkTitle')=0,
    'ALTER TABLE `ModeshowEvent` ADD COLUMN `drinkTitle` VARCHAR(191) NULL',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ModeshowEvent' AND COLUMN_NAME='drinkDescription')=0,
    'ALTER TABLE `ModeshowEvent` ADD COLUMN `drinkDescription` TEXT NULL',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ModeshowEvent' AND COLUMN_NAME='drinkCouponsPerTicket')=0,
    'ALTER TABLE `ModeshowEvent` ADD COLUMN `drinkCouponsPerTicket` INT NOT NULL DEFAULT 1',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ModeshowEvent' AND COLUMN_NAME='sponsorText')=0,
    'ALTER TABLE `ModeshowEvent` ADD COLUMN `sponsorText` TEXT NULL',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ModeshowEvent' AND COLUMN_NAME='sponsorImageUrls')=0,
    'ALTER TABLE `ModeshowEvent` ADD COLUMN `sponsorImageUrls` JSON NULL',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ModeshowEvent' AND COLUMN_NAME='claimEnabled')=0,
    'ALTER TABLE `ModeshowEvent` ADD COLUMN `claimEnabled` BOOLEAN NOT NULL DEFAULT true',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ModeshowEvent' AND COLUMN_NAME='claimRequiredForCheckin')=0,
    'ALTER TABLE `ModeshowEvent` ADD COLUMN `claimRequiredForCheckin` BOOLEAN NOT NULL DEFAULT false',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ModeshowEvent' AND COLUMN_NAME='claimInfoText')=0,
    'ALTER TABLE `ModeshowEvent` ADD COLUMN `claimInfoText` TEXT NULL',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `ModeshowEvent` SET `sponsorImageUrls` = JSON_ARRAY() WHERE `sponsorImageUrls` IS NULL;

-- ModeshowTicketOrder columns
SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ModeshowTicketOrder' AND COLUMN_NAME='qtyDrinks')=0,
    'ALTER TABLE `ModeshowTicketOrder` ADD COLUMN `qtyDrinks` INT NOT NULL DEFAULT 0',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ModeshowTicketOrder' AND COLUMN_NAME='unitPriceDrinks')=0,
    'ALTER TABLE `ModeshowTicketOrder` ADD COLUMN `unitPriceDrinks` DECIMAL(10, 2) NOT NULL DEFAULT 0',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `ModeshowTicketClaim` (
  `id` VARCHAR(191) NOT NULL,
  `eventId` VARCHAR(191) NOT NULL,
  `ticketId` VARCHAR(191) NOT NULL,
  `ticketCode` VARCHAR(191) NOT NULL,
  `firstName` VARCHAR(191) NOT NULL,
  `lastName` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(191) NULL,
  `archived` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ModeshowTicketClaim' AND INDEX_NAME='ModeshowTicketClaim_ticketId_key')=0,
    'CREATE UNIQUE INDEX `ModeshowTicketClaim_ticketId_key` ON `ModeshowTicketClaim`(`ticketId`)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ModeshowTicketClaim' AND INDEX_NAME='ModeshowTicketClaim_ticketCode_key')=0,
    'CREATE UNIQUE INDEX `ModeshowTicketClaim_ticketCode_key` ON `ModeshowTicketClaim`(`ticketCode`)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ModeshowTicketClaim' AND INDEX_NAME='ModeshowTicketClaim_eventId_idx')=0,
    'CREATE INDEX `ModeshowTicketClaim_eventId_idx` ON `ModeshowTicketClaim`(`eventId`)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ModeshowTicketClaim' AND INDEX_NAME='ModeshowTicketClaim_email_idx')=0,
    'CREATE INDEX `ModeshowTicketClaim_email_idx` ON `ModeshowTicketClaim`(`email`)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
