-- Tekstkleur op gekleurde boekingsblokken in de planning (wit vs zwart).
ALTER TABLE `AgendaCalendar` ADD COLUMN `planningTextOnColor` VARCHAR(16) NOT NULL DEFAULT 'white';
