-- CreateTable
CREATE TABLE `ModelPwaDevice` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `deviceKey` VARCHAR(191) NOT NULL,
    `userAgent` TEXT NULL,
    `displayMode` VARCHAR(191) NOT NULL DEFAULT 'standalone',
    `platform` VARCHAR(191) NULL,
    `installSource` VARCHAR(191) NULL,
    `firstSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL,

    INDEX `ModelPwaDevice_userId_idx`(`userId`),
    INDEX `ModelPwaDevice_lastSeenAt_idx`(`lastSeenAt`),
    UNIQUE INDEX `ModelPwaDevice_userId_deviceKey_key`(`userId`, `deviceKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ModelPwaDevice` ADD CONSTRAINT `ModelPwaDevice_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
