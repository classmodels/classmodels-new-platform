-- Setkaart / compositkaart per model
CREATE TABLE `ModelSetCardDraft` (
    `userId` VARCHAR(191) NOT NULL,
    `frontHeroAssetId` VARCHAR(191) NULL,
    `versoPhotoAssetIds` JSON NOT NULL DEFAULT ('[]'),
    `status` ENUM('draft', 'submitted') NOT NULL DEFAULT 'draft',
    `noteFromModel` TEXT NULL,
    `submittedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ModelSetCardDraft` ADD CONSTRAINT `ModelSetCardDraft_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
