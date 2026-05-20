-- AlterTable
ALTER TABLE `User` ADD COLUMN `setCardFreeOrder` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `ModelSetCardDraft` ADD COLUMN `molliePaymentId` VARCHAR(191) NULL,
    ADD COLUMN `paymentStatus` VARCHAR(191) NULL,
    ADD COLUMN `setCardPaidAt` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `ModelSetCardDraft_molliePaymentId_key` ON `ModelSetCardDraft`(`molliePaymentId`);

-- AlterTable
ALTER TABLE `MollieSettings` ADD COLUMN `setCardPrice` DECIMAL(10, 2) NOT NULL DEFAULT 175;
