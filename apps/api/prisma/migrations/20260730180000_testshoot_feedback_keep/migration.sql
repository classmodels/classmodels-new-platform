-- Feedback mag blijven bestaan als foto’s/slot verdwijnen; archiveren in backsite.
ALTER TABLE `TestshootFeedback` ADD COLUMN `archived` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `TestshootFeedback` ADD COLUMN `modelName` VARCHAR(191) NULL;

ALTER TABLE `TestshootFeedback` DROP FOREIGN KEY `TestshootFeedback_modelId_fkey`;
ALTER TABLE `TestshootFeedback` MODIFY `modelId` VARCHAR(191) NULL;
ALTER TABLE `TestshootFeedback` ADD CONSTRAINT `TestshootFeedback_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `TestshootModel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Vul snapshot-naam voor bestaande rijen
UPDATE `TestshootFeedback` f
LEFT JOIN `TestshootModel` m ON m.`id` = f.`modelId`
SET f.`modelName` = m.`name`
WHERE f.`modelName` IS NULL AND m.`name` IS NOT NULL;
