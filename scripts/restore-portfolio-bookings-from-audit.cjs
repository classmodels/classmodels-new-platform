/**
 * Herstel portfolio-afspraken uit AuditLog (modelportaal-historiek).
 *
 * Gastboekingen zonder login staan NIET in AuditLog — die moeten uit
 * bevestigingsmails. Dit script herstelt alleen portal-boekingen met
 * action portal.model.history.agenda_booked.
 *
 * Gebruik (productie-DB_URL):
 *   DB_URL='mysql://…' node scripts/restore-portfolio-bookings-from-audit.cjs --date=2026-09-20
 */
'use strict';

const { PrismaClient } = require('@prisma/client');

const dateArg = process.argv.find((a) => a.startsWith('--date='));
const targetYmd = dateArg ? dateArg.slice('--date='.length) : null;
if (!targetYmd || !/^\d{4}-\d{2}-\d{2}$/.test(targetYmd)) {
  console.error('Gebruik: node scripts/restore-portfolio-bookings-from-audit.cjs --date=YYYY-MM-DD');
  process.exit(1);
}

const PREFIX = 'portal.model.history.agenda_booked';

function parseYmd(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function combineLocal(ymd, hhmm) {
  const [h, mi] = hhmm.split(':').map((x) => parseInt(x, 10));
  const [y, m, d] = ymd.split('-').map(Number);
  // Europe/Brussels approx as UTC+2 in late September (CEST)
  return new Date(Date.UTC(y, m - 1, d, h - 2, mi || 0, 0));
}

async function main() {
  const prisma = new PrismaClient();
  const cal = await prisma.agendaCalendar.findFirst({ where: { slug: 'portfolio' } });
  if (!cal) throw new Error('Agenda portfolio niet gevonden');

  const logs = await prisma.auditLog.findMany({
    where: { action: PREFIX },
    orderBy: { createdAt: 'desc' },
    take: 2000,
  });

  const candidates = [];
  for (const row of logs) {
    const meta = (row.meta && typeof row.meta === 'object' ? row.meta : {}) ;
    if (meta.calendarSlug && meta.calendarSlug !== 'portfolio') continue;
    if (meta.slotDate !== targetYmd) continue;
    candidates.push({ log: row, meta });
  }

  console.log(`Gevonden in AuditLog voor ${targetYmd}: ${candidates.length}`);

  // Zorg dat open dag bestaat
  const openDate = parseYmd(targetYmd);
  await prisma.agendaOpenDay.upsert({
    where: { calendarId_openDate: { calendarId: cal.id, openDate } },
    create: { calendarId: cal.id, openDate, repeatYearly: false },
    update: {},
  });

  let restored = 0;
  let skipped = 0;

  for (const { log, meta } of candidates) {
    const startTime = String(meta.startTime || '09:00').slice(0, 5);
    const endTime = String(meta.endTime || '11:00').slice(0, 5);
    const userId = log.userId;

    let slot = await prisma.agendaSlot.findFirst({
      where: {
        calendarId: cal.id,
        slotDate: openDate,
        startTime: { startsWith: startTime },
      },
    });
    if (!slot) {
      slot = await prisma.agendaSlot.create({
        data: {
          calendarId: cal.id,
          slotDate: openDate,
          startTime: `${startTime}:00`.slice(0, 8),
          endTime: `${endTime}:00`.slice(0, 8),
          capacity: cal.capacity || 1,
          status: 'open',
        },
      });
    }

    const startAt = combineLocal(targetYmd, startTime);
    const endAt = combineLocal(targetYmd, endTime);

    if (meta.bookingId) {
      const exists = await prisma.agendaBooking.findUnique({ where: { id: String(meta.bookingId) } });
      if (exists) {
        skipped += 1;
        continue;
      }
    }

    const user = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, firstName: true, lastName: true, phone: true },
        })
      : null;

    await prisma.agendaBooking.create({
      data: {
        id: meta.bookingId ? String(meta.bookingId) : undefined,
        calendarId: cal.id,
        slotId: slot.id,
        userId: userId || null,
        startAt,
        endAt,
        status: 'confirmed',
        email: user?.email ?? null,
        firstname: user?.firstName ?? null,
        lastname: user?.lastName ?? null,
        phone: user?.phone ?? null,
        name: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || null,
        fieldsJson: { restoredFromAudit: true, auditLogId: log.id },
      },
    });
    restored += 1;
    console.log(`+ hersteld ${startTime} user=${userId || '—'} ${user?.email || ''}`);
  }

  console.log(`Klaar: restored=${restored} skipped=${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
