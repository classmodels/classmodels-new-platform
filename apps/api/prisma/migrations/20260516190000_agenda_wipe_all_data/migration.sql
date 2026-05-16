-- Eenmalig: alle agenda-data wissen (schone start). Na deploy: `npx prisma db seed` om standaard agenda's + velden terug te zetten.
DELETE FROM `AgendaBooking`;
DELETE FROM `AgendaSlot`;
DELETE FROM `AgendaOpenDay`;
DELETE FROM `AgendaClosedDay`;
DELETE FROM `AgendaField`;
DELETE FROM `AgendaCalendar`;
