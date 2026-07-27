-- Einduur tonen: standaard UIT voor elke agenda; admin schakelt het per agenda in.
ALTER TABLE `AgendaCalendar` MODIFY `showEndTimeOnPublic` BOOLEAN NOT NULL DEFAULT false;
UPDATE `AgendaCalendar` SET `showEndTimeOnPublic` = false;
