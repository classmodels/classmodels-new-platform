-- Leeg alle boekingen en beschikbaarheid; AgendaCalendar + AgendaField blijven.
DELETE FROM `AgendaBooking`;
DELETE FROM `AgendaSlot`;
DELETE FROM `AgendaOpenDay`;
DELETE FROM `AgendaClosedDay`;
