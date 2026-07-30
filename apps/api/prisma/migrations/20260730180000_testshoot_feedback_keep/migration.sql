-- Feedback mag blijven bestaan als foto’s/slot verdwijnen; archiveren in backsite.
-- Idempotent: veilig als kolommen/FK deels al bestaan (mislukte eerdere deploy).

SET @db := DATABASE();

-- archived
SET @exist := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'TestshootFeedback' AND COLUMN_NAME = 'archived'
);
SET @sql := IF(@exist = 0,
  'ALTER TABLE `TestshootFeedback` ADD COLUMN `archived` BOOLEAN NOT NULL DEFAULT false',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- modelName snapshot
SET @exist := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'TestshootFeedback' AND COLUMN_NAME = 'modelName'
);
SET @sql := IF(@exist = 0,
  'ALTER TABLE `TestshootFeedback` ADD COLUMN `modelName` VARCHAR(191) NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- modelId nullable + ON DELETE SET NULL (FK-naam dynamisch)
SET @nullable := (
  SELECT IS_NULLABLE FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'TestshootFeedback' AND COLUMN_NAME = 'modelId'
);
SET @fk := (
  SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'TestshootFeedback' AND COLUMN_NAME = 'modelId'
    AND REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
);

SET @sql := IF(@fk IS NOT NULL,
  CONCAT('ALTER TABLE `TestshootFeedback` DROP FOREIGN KEY `', @fk, '`'),
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@nullable = 'NO',
  'ALTER TABLE `TestshootFeedback` MODIFY `modelId` VARCHAR(191) NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk2 := (
  SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'TestshootFeedback' AND COLUMN_NAME = 'modelId'
    AND REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
);
SET @sql := IF(@fk2 IS NULL,
  'ALTER TABLE `TestshootFeedback` ADD CONSTRAINT `TestshootFeedback_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `TestshootModel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `TestshootFeedback` f
LEFT JOIN `TestshootModel` m ON m.`id` = f.`modelId`
SET f.`modelName` = m.`name`
WHERE f.`modelName` IS NULL AND m.`name` IS NOT NULL;
