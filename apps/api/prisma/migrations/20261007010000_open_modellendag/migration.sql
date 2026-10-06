-- Eenmalige actie: Open Modellendag inschrijvingen

CREATE TABLE `OpenModellendagRegistration` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(200) NOT NULL,
    `phone` VARCHAR(40) NOT NULL,
    `age` INT NOT NULL,
    `timeSlot` VARCHAR(8) NOT NULL,
    `ageGroup` VARCHAR(16) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `OpenModellendagRegistration_email_key`(`email`),
    INDEX `OpenModellendagRegistration_timeSlot_idx`(`timeSlot`),
    INDEX `OpenModellendagRegistration_ageGroup_idx`(`ageGroup`),
    INDEX `OpenModellendagRegistration_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
