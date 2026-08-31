ALTER TABLE `Role` ADD COLUMN `catalogVisibility` VARCHAR(32) NOT NULL DEFAULT 'admin_frontend';

UPDATE `Role` SET `catalogVisibility` = 'public' WHERE `slug` IN ('newface', 'tryout', 'high-class');
UPDATE `Role` SET `catalogVisibility` = 'admin_frontend' WHERE `slug` = 'inactief';
