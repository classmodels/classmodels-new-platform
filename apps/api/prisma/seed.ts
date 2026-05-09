import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const roles: { slug: string; label: string; permissions: string[] }[] = [
    { slug: 'admin', label: 'Administrator', permissions: ['*'] },
    {
      slug: 'model',
      label: 'Model',
      permissions: [
        'portal.model.briefs.read',
        'portal.model.briefs.respond',
        'portal.model.media.read',
        'portal.model.media.upload',
        'payments.checkout',
      ],
    },
    {
      slug: 'client',
      label: 'Klant',
      permissions: ['portal.client.briefs.read', 'portal.client.briefs.write'],
    },
    { slug: 'guest', label: 'Gast', permissions: [] },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { slug: r.slug },
      update: { label: r.label, permissions: r.permissions },
      create: r,
    });
  }

  const hash = await bcrypt.hash('Demo123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@class-models.local' },
    update: {},
    create: {
      email: 'admin@class-models.local',
      passwordHash: hash,
      firstName: 'Admin',
      lastName: 'Demo',
      defaultPortal: 'guest',
      roles: {
        create: [{ role: { connect: { slug: 'admin' } } }],
      },
    },
    include: { roles: { include: { role: true } } },
  });

  await prisma.user.upsert({
    where: { email: 'model@class-models.local' },
    update: {},
    create: {
      email: 'model@class-models.local',
      passwordHash: hash,
      firstName: 'Model',
      lastName: 'Demo',
      defaultPortal: 'model',
      roles: { create: [{ role: { connect: { slug: 'model' } } }] },
    },
  });

  await prisma.user.upsert({
    where: { email: 'klant@class-models.local' },
    update: {},
    create: {
      email: 'klant@class-models.local',
      passwordHash: hash,
      firstName: 'Klant',
      lastName: 'Demo',
      defaultPortal: 'client',
      roles: { create: [{ role: { connect: { slug: 'client' } } }] },
    },
  });

  await prisma.contentString.upsert({
    where: { key: 'home.hero.title' },
    update: {},
    create: {
      key: 'home.hero.title',
      value: 'Class-Models',
      locale: 'nl',
    },
  });

  await prisma.contentString.upsert({
    where: { key: 'home.hero.subtitle' },
    update: {},
    create: {
      key: 'home.hero.subtitle',
      value: 'Modeling Agency',
      locale: 'nl',
    },
  });

  await prisma.mollieSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  const guestMain = await prisma.menu.upsert({
    where: { slug: 'guest-main' },
    update: {},
    create: {
      slug: 'guest-main',
      label: 'Hoofdmenu (gast)',
      portal: 'guest',
      placement: 'top',
    },
  });

  const modelMain = await prisma.menu.upsert({
    where: { slug: 'model-main' },
    update: {},
    create: {
      slug: 'model-main',
      label: 'Modellenportaal',
      portal: 'model',
      placement: 'top',
    },
  });

  const clientMain = await prisma.menu.upsert({
    where: { slug: 'client-main' },
    update: {},
    create: {
      slug: 'client-main',
      label: 'Klantenportaal',
      portal: 'client',
      placement: 'top',
    },
  });

  const menuItems: {
    menuId: string;
    label: string;
    href: string;
    sortOrder: number;
    requiresPremium: boolean;
    roleSlugs: string[];
  }[] = [
    { menuId: guestMain.id, label: 'Home', href: '/', sortOrder: 0, requiresPremium: false, roleSlugs: [] },
    {
      menuId: guestMain.id,
      label: 'Voor bezoekers',
      href: '/portal/guest',
      sortOrder: 1,
      requiresPremium: false,
      roleSlugs: [],
    },
    { menuId: guestMain.id, label: 'Inloggen', href: '/login', sortOrder: 2, requiresPremium: false, roleSlugs: [] },
    {
      menuId: guestMain.id,
      label: 'Modellenportaal',
      href: '/portal/model',
      sortOrder: 3,
      requiresPremium: false,
      roleSlugs: ['model', 'admin'],
    },
    {
      menuId: guestMain.id,
      label: 'Klantenportaal',
      href: '/portal/client',
      sortOrder: 4,
      requiresPremium: false,
      roleSlugs: ['client', 'admin'],
    },
    {
      menuId: modelMain.id,
      label: 'Dashboard',
      href: '/portal/model',
      sortOrder: 0,
      requiresPremium: false,
      roleSlugs: [],
    },
    {
      menuId: clientMain.id,
      label: 'Overzicht',
      href: '/portal/client',
      sortOrder: 0,
      requiresPremium: false,
      roleSlugs: [],
    },
  ];

  for (const it of menuItems) {
    const existing = await prisma.menuItem.findFirst({
      where: { menuId: it.menuId, href: it.href },
    });
    if (!existing) {
      await prisma.menuItem.create({
        data: {
          menuId: it.menuId,
          label: it.label,
          href: it.href,
          sortOrder: it.sortOrder,
          requiresPremium: it.requiresPremium,
          roleSlugs: it.roleSlugs,
          visibleWeb: true,
          visibleApp: true,
        },
      });
    }
  }

  const folders: [string, string][] = [
    ['casting', 'Casting'],
    ['site', 'Site'],
    ['uploads', 'Uploads'],
    ['opdrachten', 'Opdrachten'],
    ['reviews', 'Reviews'],
    ['models', 'Modellen'],
  ];
  for (const [slug, label] of folders) {
    await prisma.mediaFolder.upsert({
      where: { slug },
      update: { label },
      create: { slug, label },
    });
  }

  const demoRev = await prisma.review.findFirst({
    where: { title: 'Professioneel platform' },
  });
  if (!demoRev) {
    await prisma.review.create({
      data: {
        title: 'Professioneel platform',
        body: 'Class Models combineert een strakke site met duidelijke communicatie. Aanrader voor modellen en klanten.',
        authorName: 'Demo klant',
        rating: 5,
        sortOrder: 0,
        approved: true,
        visible: true,
      },
    });
  }

  const extraContent: { key: string; value: string; portal?: 'guest' | 'model' | 'client' }[] = [
    {
      key: 'portal.guest.title',
      value: 'Welkom bij Class Models',
      portal: 'guest',
    },
    {
      key: 'portal.guest.intro',
      value: 'Informatie voor bezoekers, modellen en klanten — het nieuwe platform naast de bestaande site.',
      portal: 'guest',
    },
    {
      key: 'portal.guest.body',
      value:
        'Log in voor het modellen- of klantenportaal. Premium-functies worden per rol en abonnement vrijgegeven.',
      portal: 'guest',
    },
    { key: 'portal.model.title', value: 'Modellenportaal', portal: 'model' },
    { key: 'portal.model.intro', value: 'Welkom bij jouw persoonlijke omgeving.', portal: 'model' },
    {
      key: 'portal.model.section2',
      value: 'Agenda, opdrachten en berichten worden hier verder uitgewerkt; dit is de CMS-basis.',
      portal: 'model',
    },
    {
      key: 'portal.model.premium.title',
      value: 'Class Models Premium',
      portal: 'model',
    },
    {
      key: 'portal.model.premium.intro',
      value: 'Krijg toegang tot extra functies op het platform. Betaling verloopt veilig via Mollie.',
      portal: 'model',
    },
    { key: 'portal.client.title', value: 'Klantenportaal', portal: 'client' },
    { key: 'portal.client.intro', value: 'Beheer opdrachten en communicatie op één plek.', portal: 'client' },
    {
      key: 'portal.client.section2',
      value: 'Offertes, casting en facturatie sluiten hier later op aan.',
      portal: 'client',
    },
    { key: 'home.reviews.title', value: 'Ervaringen' },
  ];
  for (const c of extraContent) {
    await prisma.contentString.upsert({
      where: { key: c.key },
      update: { value: c.value, portal: c.portal ?? null },
      create: { key: c.key, value: c.value, locale: 'nl', portal: c.portal ?? undefined },
    });
  }

  console.log('Seed OK. Demo login (alle drie wachtwoord): Demo123!');
  console.log('  admin@class-models.local');
  console.log('  model@class-models.local');
  console.log('  klant@class-models.local');
  console.log('Admin user id:', admin.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
