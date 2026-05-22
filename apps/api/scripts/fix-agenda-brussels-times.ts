/**
 * Eenmalig: corrigeer startAt/endAt van alle agenda-boekingen naar Europe/Brussels.
 * Run: npm run agenda:fix-times -w @cm/api
 */
import { PrismaClient } from '@prisma/client';
import {
  combineBrusselsLocalToUtc,
  normTimePlain,
  slotDateToYmd,
} from '../src/agenda/agenda-brussels-time';

async function main() {
  const prisma = new PrismaClient();
  const rows = await prisma.agendaBooking.findMany({
    include: { slot: true },
  });
  let updated = 0;
  for (const b of rows) {
    if (!b.slot) continue;
    const startNorm = normTimePlain(b.slot.startTime);
    const endNorm = normTimePlain(b.slot.endTime);
    const startAt = combineBrusselsLocalToUtc(b.slot.slotDate, startNorm);
    const endAt = combineBrusselsLocalToUtc(b.slot.slotDate, endNorm);
    if (startAt.getTime() === b.startAt.getTime() && endAt.getTime() === b.endAt.getTime()) continue;
    await prisma.agendaBooking.update({
      where: { id: b.id },
      data: { startAt, endAt },
    });
    updated += 1;
    console.log(
      `OK ${b.id} ${slotDateToYmd(b.slot.slotDate)} ${startNorm.slice(0, 5)}–${endNorm.slice(0, 5)}`,
    );
  }
  console.log(`Klaar: ${updated}/${rows.length} boekingen bijgewerkt.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
