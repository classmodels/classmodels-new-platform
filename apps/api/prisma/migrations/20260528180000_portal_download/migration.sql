CREATE TABLE `PortalDownload` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `mediaAssetId` VARCHAR(191) NOT NULL,
    `section` VARCHAR(191) NOT NULL DEFAULT 'model-portal',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `availableFrom` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PortalDownload_section_active_sortOrder_idx`(`section`, `active`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PortalDownload` ADD CONSTRAINT `PortalDownload_mediaAssetId_fkey` FOREIGN KEY (`mediaAssetId`) REFERENCES `MediaAsset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
