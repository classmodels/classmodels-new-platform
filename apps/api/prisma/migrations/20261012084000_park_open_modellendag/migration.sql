-- Parkeer de editie van 11 oktober: inschrijvingen blijven, maar horen niet meer bij een actieve actie.

ALTER TABLE `OpenModellendagRegistration`
  ADD COLUMN `parkKey` VARCHAR(32) NOT NULL DEFAULT '';

DROP INDEX `OpenModellendagRegistration_email_key` ON `OpenModellendagRegistration`;

CREATE UNIQUE INDEX `OpenModellendagRegistration_email_parkKey_key`
  ON `OpenModellendagRegistration`(`email`, `parkKey`);

CREATE INDEX `OpenModellendagRegistration_parkKey_idx`
  ON `OpenModellendagRegistration`(`parkKey`);

UPDATE `OpenModellendagRegistration`
SET `parkKey` = '2026-10-11'
WHERE `parkKey` = '' AND `createdAt` < '2026-10-13 00:00:00';
