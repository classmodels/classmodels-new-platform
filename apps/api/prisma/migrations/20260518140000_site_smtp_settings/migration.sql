-- Site-e-mail (SMTP) — optioneel; wint van lege process.env SMTP_* als smtpHost gezet is
CREATE TABLE `SiteSmtpSettings` (
    `id` INTEGER NOT NULL,
    `smtpHost` VARCHAR(191) NULL,
    `smtpPort` INTEGER NULL,
    `smtpSecure` BOOLEAN NOT NULL DEFAULT false,
    `smtpUser` VARCHAR(191) NULL,
    `smtpPass` TEXT NULL,
    `mailFrom` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `SiteSmtpSettings` (`id`, `smtpSecure`, `updatedAt`) VALUES (1, false, CURRENT_TIMESTAMP(3));
