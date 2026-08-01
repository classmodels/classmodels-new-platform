-- AlterTable
ALTER TABLE `TryoutModeshowRegistration`
  ADD COLUMN `listPrice` DECIMAL(10, 2) NULL,
  ADD COLUMN `discountAmount` DECIMAL(10, 2) NULL,
  ADD COLUMN `isFree` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `couponId` VARCHAR(191) NULL,
  ADD COLUMN `couponCode` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `TryoutCoupon` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `discountType` VARCHAR(191) NOT NULL,
    `discountValue` DECIMAL(10, 2) NOT NULL,
    `maxTotalUses` INTEGER NULL,
    `maxUsesPerUser` INTEGER NOT NULL DEFAULT 1,
    `usedCount` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `editionSlug` VARCHAR(191) NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TryoutCoupon_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TryoutCouponRedemption` (
    `id` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `registrationId` VARCHAR(191) NOT NULL,
    `amountBefore` DECIMAL(10, 2) NOT NULL,
    `amountAfter` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TryoutCouponRedemption_registrationId_key`(`registrationId`),
    INDEX `TryoutCouponRedemption_couponId_userId_idx`(`couponId`, `userId`),
    INDEX `TryoutCouponRedemption_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `TryoutModeshowRegistration_couponId_idx` ON `TryoutModeshowRegistration`(`couponId`);

-- AddForeignKey
ALTER TABLE `TryoutModeshowRegistration` ADD CONSTRAINT `TryoutModeshowRegistration_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `TryoutCoupon`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TryoutCouponRedemption` ADD CONSTRAINT `TryoutCouponRedemption_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `TryoutCoupon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TryoutCouponRedemption` ADD CONSTRAINT `TryoutCouponRedemption_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TryoutCouponRedemption` ADD CONSTRAINT `TryoutCouponRedemption_registrationId_fkey` FOREIGN KEY (`registrationId`) REFERENCES `TryoutModeshowRegistration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
