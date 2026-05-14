-- Portfolio-levering: fotograaf koppelt uploads aan model (map portfolio-fotograaf).
ALTER TABLE `MediaAsset` ADD COLUMN `linkedModelUserId` VARCHAR(191) NULL;

CREATE INDEX `MediaAsset_linkedModelUserId_folderId_idx` ON `MediaAsset`(`linkedModelUserId`, `folderId`);

ALTER TABLE `MediaAsset` ADD CONSTRAINT `MediaAsset_linkedModelUserId_fkey` FOREIGN KEY (`linkedModelUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
