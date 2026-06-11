-- Moment waarop de afspraak werd geannuleerd (door gast, model of admin).
ALTER TABLE `AgendaBooking` ADD COLUMN `cancelledAt` DATETIME(3) NULL;
