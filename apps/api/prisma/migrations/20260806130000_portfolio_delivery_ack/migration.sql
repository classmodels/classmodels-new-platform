-- Portfolio download-status per model (na model-download blijven bestanden weg, ack blijft).
CREATE TABLE `PortfolioDeliveryAck` (
    `id` VARCHAR(191) NOT NULL,
    `modelUserId` VARCHAR(191) NOT NULL,
    `downloadedAt` DATETIME(3) NOT NULL,
    `fileCount` INTEGER NOT NULL DEFAULT 0,
    `shootDate` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `PortfolioDeliveryAck_modelUserId_key` ON `PortfolioDeliveryAck`(`modelUserId`);
CREATE INDEX `PortfolioDeliveryAck_shootDate_idx` ON `PortfolioDeliveryAck`(`shootDate`);

ALTER TABLE `PortfolioDeliveryAck` ADD CONSTRAINT `PortfolioDeliveryAck_modelUserId_fkey` FOREIGN KEY (`modelUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
