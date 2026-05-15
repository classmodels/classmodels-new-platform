-- Mollie test/live modus instelbaar vanuit backoffice
ALTER TABLE `MollieSettings`
  ADD COLUMN `activeMode` VARCHAR(191) NOT NULL DEFAULT 'test';
