import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Reset agenda: verwijderen van boekingen, sloten en dagen…');

  await prisma.$transaction([
    prisma.agendaBooking.deleteMany({}),
    prisma.agendaSlot.deleteMany({}),
    prisma.agendaClosedDay.deleteMany({}),
    prisma.agendaOpenDay.deleteMany({}),
  ]);

  console.log('Reset agenda: klaar.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

