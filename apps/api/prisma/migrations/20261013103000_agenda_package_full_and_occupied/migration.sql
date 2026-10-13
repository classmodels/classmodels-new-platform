ALTER TABLE `AgendaOpenDay` ADD COLUMN `fullyBookedTestshoot` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `AgendaOpenDay` ADD COLUMN `fullyBookedIntake` BOOLEAN NOT NULL DEFAULT false;
UPDATE `AgendaOpenDay`
SET `fullyBookedTestshoot` = true, `fullyBookedIntake` = true
WHERE `fullyBooked` = true;
ALTER TABLE `AgendaCalendar` ADD COLUMN `showOccupiedHoursTestshoot` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `AgendaCalendar` ADD COLUMN `showOccupiedHoursIntake` BOOLEAN NOT NULL DEFAULT false;
