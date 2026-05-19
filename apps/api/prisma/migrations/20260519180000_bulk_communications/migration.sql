-- Bulk mail/SMS lists, campaigns, delivery tracking

CREATE TABLE `BulkContactList` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BulkContactListEntry` (
    `id` VARCHAR(191) NOT NULL,
    `listId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(64) NULL,
    `displayName` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BulkContactListEntry_listId_idx`(`listId`),
    INDEX `BulkContactListEntry_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BulkMessageCampaign` (
    `id` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(500) NULL,
    `bodyHtml` LONGTEXT NULL,
    `bodySms` TEXT NULL,
    `listId` VARCHAR(191) NULL,
    `roleSlugs` JSON NULL,
    `sentById` VARCHAR(191) NULL,
    `sentCount` INTEGER NOT NULL DEFAULT 0,
    `failedCount` INTEGER NOT NULL DEFAULT 0,
    `skippedCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BulkMessageCampaign_createdAt_idx`(`createdAt`),
    INDEX `BulkMessageCampaign_listId_idx`(`listId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BulkMessageDelivery` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(64) NULL,
    `displayName` VARCHAR(191) NULL,
    `trackingToken` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `sentAt` DATETIME(3) NULL,
    `openedAt` DATETIME(3) NULL,
    `openCount` INTEGER NOT NULL DEFAULT 0,
    `lastOpenedAt` DATETIME(3) NULL,
    `openMeta` JSON NULL,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BulkMessageDelivery_trackingToken_key`(`trackingToken`),
    INDEX `BulkMessageDelivery_campaignId_idx`(`campaignId`),
    INDEX `BulkMessageDelivery_email_idx`(`email`),
    INDEX `BulkMessageDelivery_openedAt_idx`(`openedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `BulkContactList` ADD CONSTRAINT `BulkContactList_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `BulkContactListEntry` ADD CONSTRAINT `BulkContactListEntry_listId_fkey` FOREIGN KEY (`listId`) REFERENCES `BulkContactList`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `BulkContactListEntry` ADD CONSTRAINT `BulkContactListEntry_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `BulkMessageCampaign` ADD CONSTRAINT `BulkMessageCampaign_listId_fkey` FOREIGN KEY (`listId`) REFERENCES `BulkContactList`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `BulkMessageCampaign` ADD CONSTRAINT `BulkMessageCampaign_sentById_fkey` FOREIGN KEY (`sentById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `BulkMessageDelivery` ADD CONSTRAINT `BulkMessageDelivery_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `BulkMessageCampaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `BulkMessageDelivery` ADD CONSTRAINT `BulkMessageDelivery_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
