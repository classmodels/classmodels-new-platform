-- Slot-stap, handmatige startlijst en zichtbaarheid einduur voor gasten
ALTER TABLE `AgendaCalendar`
    ADD COLUMN `slotStepMinutes` INTEGER NULL,
    ADD COLUMN `optionalSlotStarts` TEXT NULL,
    ADD COLUMN `showEndTimeOnPublic` BOOLEAN NOT NULL DEFAULT true;
