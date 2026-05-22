-- CreateTable
CREATE TABLE `BulkMailUnsubscribe` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `displayName` VARCHAR(191) NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'link',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BulkMailUnsubscribe_email_key`(`email`),
    INDEX `BulkMailUnsubscribe_userId_idx`(`userId`),
    INDEX `BulkMailUnsubscribe_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BulkMailUnsubscribe` ADD CONSTRAINT `BulkMailUnsubscribe_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
