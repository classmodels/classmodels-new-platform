-- Wist alleen afspraken, sloten en expliciete open dagen. AgendaCalendar + AgendaField blijven behouden (geen seed nodig).
-- Volgorde: eerst boekingen (FK naar slot met Restrict).
DELETE FROM `AgendaBooking`;
DELETE FROM `AgendaSlot`;
DELETE FROM `AgendaOpenDay`;
