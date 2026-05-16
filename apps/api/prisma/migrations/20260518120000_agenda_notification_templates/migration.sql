-- Sjablonen voor agenda e-mail/SMS + BulkSMS-instellingen
CREATE TABLE `AgendaMessagingSettings` (
    `id` INTEGER NOT NULL,
    `bulksmsUsername` VARCHAR(191) NULL,
    `bulksmsPassword` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `AgendaMessagingSettings` (`id`, `bulksmsUsername`, `bulksmsPassword`, `updatedAt`)
VALUES (1, NULL, NULL, CURRENT_TIMESTAMP(3));

CREATE TABLE `AgendaNotificationTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL DEFAULT 'email',
    `name` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `trigger` VARCHAR(191) NOT NULL DEFAULT 'booking_created',
    `offsetMinutes` INTEGER NOT NULL DEFAULT 0,
    `subject` VARCHAR(191) NULL,
    `body` TEXT NOT NULL,
    `calendarSlugs` JSON NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 100,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `AgendaNotificationTemplate_enabled_trigger_channel_idx` ON `AgendaNotificationTemplate` (`enabled`, `trigger`, `channel`);
