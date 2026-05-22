-- AlterTable
ALTER TABLE `BulkMessageCampaign` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'completed';
ALTER TABLE `BulkMessageCampaign` ADD COLUMN `excludedKeys` JSON NULL;
