-- Moment waarop de gast zijn komst bevestigde (status `acknowledged`).
ALTER TABLE `AgendaBooking` ADD COLUMN `acknowledgedAt` DATETIME(3) NULL;
