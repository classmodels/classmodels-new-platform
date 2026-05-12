/**
 * Nieuw platform gebruikt eigen wachtwoord-hash; WordPress-wachtwoorden worden nooit meegeïmporteerd.
 *
 *   npx ts-node scripts/set-user-password.ts --email=model@x.be --password='Minstens10Tekens!' --dry-run
 *   npx ts-node scripts/set-user-password.ts --email=model@x.be --password='Minstens10Tekens!' --apply
 */
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function argValue(name: string): string | undefined {
  const pref = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(pref));
  return hit ? hit.slice(pref.length) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const email = (argValue('email') || '').toLowerCase().trim();
  const password = argValue('password') || '';
  const dryRun = hasFlag('dry-run');
  const apply = hasFlag('apply');
  if (!email || !email.includes('@')) {
    console.error('Gebruik: --email=user@domein.be --password=... [--dry-run|--apply]');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error('Wachtwoord minimaal 10 tekens.');
    process.exit(1);
  }
  if (!apply && !dryRun) {
    console.error('Geef --dry-run of --apply');
    process.exit(1);
  }
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!u) {
    console.error(`Geen gebruiker met e-mail: ${email}`);
    process.exit(1);
  }
  if (dryRun) {
    console.log(`WOULD set password for ${email}`);
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash } });
  console.log(JSON.stringify({ ok: true, email }, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
