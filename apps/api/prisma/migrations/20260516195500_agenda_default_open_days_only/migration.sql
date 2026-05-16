-- Online boeken: alleen op expliciet gemarkeerde open dagen (geen automatische ma–vr-sloten meer).
UPDATE `AgendaCalendar` SET `restrictToOpenDays` = 1, `weekdayOpenMask` = 0;

ALTER TABLE `AgendaCalendar` MODIFY `restrictToOpenDays` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `AgendaCalendar` MODIFY `weekdayOpenMask` INT NOT NULL DEFAULT 0;
