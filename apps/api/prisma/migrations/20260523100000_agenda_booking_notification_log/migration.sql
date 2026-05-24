-- CreateTable
CREATE TABLE `AgendaBookingNotificationLog` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL,
    `trigger` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NULL,
    `templateName` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NULL,
    `recipient` VARCHAR(191) NULL,
    `bodyPreview` TEXT NULL,
    `sent` BOOLEAN NOT NULL DEFAULT false,
    `sentAt` DATETIME(3) NULL,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AgendaBookingNotificationLog_bookingId_sentAt_idx`(`bookingId`, `sentAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AgendaBookingNotificationLog` ADD CONSTRAINT `AgendaBookingNotificationLog_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `AgendaBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
