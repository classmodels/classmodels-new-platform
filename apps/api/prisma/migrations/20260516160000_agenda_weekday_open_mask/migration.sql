-- Weekdag-masker i.p.v. oranje open dagen voor lazy slot-aanmaak; oude restrict-modus uit voor bestaande rijen
ALTER TABLE `AgendaCalendar` ADD COLUMN `weekdayOpenMask` INTEGER NOT NULL DEFAULT 62;
UPDATE `AgendaCalendar` SET `restrictToOpenDays` = 0;
