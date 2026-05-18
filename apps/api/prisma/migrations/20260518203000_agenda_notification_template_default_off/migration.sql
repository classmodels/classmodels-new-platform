-- Nieuwe sjablonen standaard uit; bestaande rijen blijven ongewijzigd.
ALTER TABLE `AgendaNotificationTemplate` MODIFY `enabled` BOOLEAN NOT NULL DEFAULT false;
