import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type FieldSeed = readonly [
  string,
  string,
  string,
  boolean,
  string,
  string,
  string,
  number,
  string,
];

const GENERIC_FIELDS: FieldSeed[] = [
  ['voornaam', 'Voornaam', 'text', true, '2', 'Voornaam', 'above', 10, ''],
  ['familienaam', 'Familienaam', 'text', true, '2', 'Familienaam', 'above', 20, ''],
  ['geboortedatum', 'Geboortedatum', 'date', true, '2', 'Geboortedatum', 'above', 25, ''],
  ['straat', 'Straat', 'text', true, '2', 'Straat', 'above', 30, ''],
  ['nr', 'Nr.', 'text', true, '3', 'Nr.', 'above', 35, ''],
  ['postcode', 'Postcode', 'text', true, '3', 'Postcode', 'above', 40, ''],
  ['gemeente', 'Gemeente', 'text', true, '2', 'Gemeente', 'above', 45, ''],
  ['email', 'E-mail', 'email', true, '2', 'E-mail', 'above', 50, ''],
  ['telefoon', 'Telefoon', 'tel', true, '2', 'Telefoon', 'above', 55, ''],
  [
    'hoe_terecht',
    'Hoe bent u bij ons terecht gekomen?',
    'select',
    false,
    '2',
    'Kies',
    'above',
    60,
    'Google\nFacebook\nInstagram\nTikTok\nAndere',
  ],
  ['bericht', 'Opmerkingen', 'textarea', false, '1', 'Eventuele opmerking', 'above', 65, ''],
  ['foto', 'Foto', 'file', false, '2', 'Upload een foto', 'above', 70, ''],
];

const MODEL_FIELDS: FieldSeed[] = [
  ['naam', 'Naam', 'text', false, '1', 'Naam', 'above', 10, ''],
  ['geboortedatum', 'Geboortedatum', 'date', false, '2', 'Geboortedatum', 'above', 15, ''],
  ['straat', 'Straat', 'text', false, '2', 'Straat', 'above', 20, ''],
  ['nr', 'Nr.', 'text', false, '3', 'Nr.', 'above', 25, ''],
  ['postcode', 'Postcode', 'text', false, '3', 'Postcode', 'above', 30, ''],
  ['gemeente', 'Gemeente', 'text', false, '2', 'Gemeente', 'above', 35, ''],
  ['email', 'E-mail', 'email', false, '2', 'E-mail', 'above', 40, ''],
  ['telefoon', 'Telefoon', 'tel', false, '2', 'Telefoon', 'above', 45, ''],
  [
    'hoe_terecht',
    'Hoe bent u bij ons terecht gekomen?',
    'select',
    false,
    '2',
    'Kies',
    'above',
    50,
    'Google\nFacebook\nInstagram\nTikTok\nAndere',
  ],
  ['bericht', 'Opmerkingen', 'textarea', false, '1', 'Eventuele opmerking', 'above', 55, ''],
  ['foto', 'Foto', 'file', false, '2', 'Upload een foto', 'above', 60, ''],
];

/** Agenda Pro-equivalent — zelfde slugs/colors als WP-plugin defaults. Geen demo-sloten: sloten komen van weekdagen + API. */
async function seedAgenda(p: PrismaClient) {
  const defs: {
    slug: string;
    title: string;
    color: string;
    durationMinutes: number;
    capacity: number;
    legacyType: string;
    sortOrder: number;
    defaultDayStartTime?: string;
    defaultDayEndTime?: string;
  }[] = [
    {
      slug: 'portfolio',
      title: 'Portfolio afspraak',
      color: '#070414',
      durationMinutes: 30,
      capacity: 1,
      legacyType: 'portfolio',
      sortOrder: 10,
    },
    {
      slug: 'opleiding',
      title: 'Opleiding afspraak',
      color: '#45525f',
      durationMinutes: 180,
      capacity: 1,
      legacyType: 'opleiding',
      sortOrder: 20,
      defaultDayStartTime: '14:00:00',
      defaultDayEndTime: '17:00:00',
    },
    {
      slug: 'intake-gesprek',
      title: 'Intake-Gesprek',
      color: '#2f6f55',
      durationMinutes: 60,
      capacity: 1,
      legacyType: 'generic',
      sortOrder: 30,
    },
    {
      slug: 'casting',
      title: 'Casting',
      color: '#2e66c7',
      durationMinutes: 60,
      capacity: 1,
      legacyType: 'generic',
      sortOrder: 40,
    },
    {
      slug: 'gratis-fotoshoot',
      title: 'Gratis Fotoshoot',
      color: '#b7cae8',
      durationMinutes: 90,
      capacity: 1,
      legacyType: 'generic',
      sortOrder: 50,
    },
  ];

  for (const d of defs) {
    const dayStart = d.defaultDayStartTime ?? '08:00:00';
    const dayEnd = d.defaultDayEndTime ?? '18:00:00';
    const cal = await p.agendaCalendar.upsert({
      where: { slug: d.slug },
      update: {
        title: d.title,
        color: d.color,
        durationMinutes: d.durationMinutes,
        capacity: d.capacity,
        sortOrder: d.sortOrder,
        active: true,
        publicBooking: true,
        restrictToOpenDays: true,
        weekdayOpenMask: 0,
        defaultDayStartTime: dayStart,
        defaultDayEndTime: dayEnd,
      },
      create: {
        slug: d.slug,
        title: d.title,
        description: '',
        color: d.color,
        durationMinutes: d.durationMinutes,
        capacity: d.capacity,
        active: true,
        publicBooking: true,
        sortOrder: d.sortOrder,
        restrictToOpenDays: true,
        weekdayOpenMask: 0,
        defaultDayStartTime: dayStart,
        defaultDayEndTime: dayEnd,
      },
    });

    const fieldCount = await p.agendaField.count({ where: { calendarId: cal.id } });
    if (fieldCount === 0) {
      const rows = ['portfolio', 'opleiding'].includes(d.legacyType) ? MODEL_FIELDS : GENERIC_FIELDS;
      await p.agendaField.createMany({
        data: rows.map((r) => ({
          calendarId: cal.id,
          fieldKey: r[0],
          label: r[1],
          type: r[2],
          required: r[3],
          width: r[4],
          placeholder: r[5],
          titlePosition: r[6],
          sortOrder: r[7],
          options: r[8] || null,
          active: true,
        })),
      });
    }
  }

  for (const c of await p.agendaCalendar.findMany({ select: { id: true } })) {
    const hasFoto = await p.agendaField.findFirst({ where: { calendarId: c.id, fieldKey: 'foto' } });
    if (hasFoto) continue;
    await p.agendaField.create({
      data: {
        calendarId: c.id,
        fieldKey: 'foto',
        label: 'Foto',
        type: 'file',
        required: false,
        width: '2',
        placeholder: 'Upload een foto',
        titlePosition: 'above',
        sortOrder: 200,
        active: true,
      },
    });
  }

  // Belangrijk: geen “hardcoded” opleidingsdagen tenzij expliciet gewenst.
  if (process.env.SEED_AGENDA_OPEN_DAYS === '1') {
    await seedOpleidingOpenDays(p);
  }

  console.log('Agenda seed: agendas + formuliervelden (geen voorbeeldsloten).');
}

/** Weekdagen vooruit als open opleidingsdagen (één blok 14–17 per dag via slotgeneratie). */
async function seedOpleidingOpenDays(p: PrismaClient) {
  const cal = await p.agendaCalendar.findUnique({ where: { slug: 'opleiding' } });
  if (!cal) return;
  const existing = await p.agendaOpenDay.count({ where: { calendarId: cal.id } });
  if (existing > 0) return;
  const start = new Date();
  let added = 0;
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const limitDays = 120;
  for (let i = 0; i < limitDays && added < 45; i++) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      const openDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      await p.agendaOpenDay.create({
        data: { calendarId: cal.id, openDate, repeatYearly: false },
      });
      added++;
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

async function main() {
  const roles: { slug: string; label: string; permissions: string[] }[] = [
    { slug: 'admin', label: 'Administrator', permissions: ['*'] },
    {
      slug: 'fotograaf',
      label: 'Fotograaf',
      permissions: ['photographer.portfolio.upload'],
    },
    {
      slug: 'model',
      label: 'Model',
      permissions: [
        'portal.model.briefs.read',
        'portal.model.briefs.respond',
        'portal.model.media.read',
        'portal.model.media.upload',
        'portal.model.agenda.read',
        'portal.model.agenda.book',
        'portal.model.history.read',
        'portal.model.push.read',
        'portal.model.push.subscribe',
        'payments.checkout',
      ],
    },
    {
      slug: 'newface',
      label: 'Newface',
      permissions: [
        'portal.model.briefs.read',
        'portal.model.briefs.respond',
        'portal.model.media.read',
        'portal.model.media.upload',
        'portal.model.agenda.read',
        'portal.model.agenda.book',
        'portal.model.history.read',
        'portal.model.push.read',
        'portal.model.push.subscribe',
        'payments.checkout',
      ],
    },
    {
      slug: 'tryout',
      label: 'Try-out',
      permissions: [
        'portal.model.briefs.read',
        'portal.model.briefs.respond',
        'portal.model.media.read',
        'portal.model.media.upload',
        'portal.model.agenda.read',
        'portal.model.agenda.book',
        'portal.model.history.read',
        'portal.model.push.read',
        'portal.model.push.subscribe',
        'payments.checkout',
      ],
    },
    {
      slug: 'inactief',
      label: 'Inactief model',
      permissions: [
        'portal.model.briefs.read',
        'portal.model.media.read',
        'portal.model.agenda.read',
        'portal.model.history.read',
        'portal.model.push.read',
        'portal.model.push.subscribe',
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

  await prisma.user.upsert({
    where: { email: 'fotograaf@class-models.local' },
    update: {
      passwordHash: hash,
      firstName: 'Fotograaf',
      lastName: 'Demo',
      defaultPortal: 'guest',
      status: 'active',
    },
    create: {
      email: 'fotograaf@class-models.local',
      passwordHash: hash,
      firstName: 'Fotograaf',
      lastName: 'Demo',
      defaultPortal: 'guest',
      roles: { create: [{ role: { connect: { slug: 'fotograaf' } } }] },
    },
  });
  const fotoUser = await prisma.user.findUnique({
    where: { email: 'fotograaf@class-models.local' },
    select: { id: true },
  });
  const fotoRoleRow = await prisma.role.findUnique({ where: { slug: 'fotograaf' } });
  if (fotoUser && fotoRoleRow) {
    const ur = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: fotoUser.id, roleId: fotoRoleRow.id } },
    });
    if (!ur) {
      await prisma.userRole.create({ data: { userId: fotoUser.id, roleId: fotoRoleRow.id } });
    }
  }

  await prisma.contentString.upsert({
    where: { key_locale: { key: 'home.hero.title', locale: 'nl' } },
    update: {},
    create: {
      key: 'home.hero.title',
      value: 'Class-Models',
      locale: 'nl',
    },
  });

  await prisma.contentString.upsert({
    where: { key_locale: { key: 'home.hero.subtitle', locale: 'nl' } },
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

  await prisma.siteSmtpSettings.upsert({
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

  const guestHomeLeft = await prisma.menu.upsert({
    where: { slug: 'guest-home-left' },
    update: { placement: 'left', label: 'Zijbalk home (gast)' },
    create: {
      slug: 'guest-home-left',
      label: 'Zijbalk home (gast)',
      portal: 'guest',
      placement: 'left',
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
      menuId: guestHomeLeft.id,
      label: 'Model worden',
      href: '/portal/guest',
      sortOrder: 0,
      requiresPremium: false,
      roleSlugs: [],
    },
    {
      menuId: guestHomeLeft.id,
      label: 'Gratis fotoshoot',
      href: '/portal/guest?p=gratis-fotoshoot',
      sortOrder: 10,
      requiresPremium: false,
      roleSlugs: [],
    },
    {
      menuId: guestHomeLeft.id,
      label: 'Casting',
      href: '/portal/guest?p=casting',
      sortOrder: 20,
      requiresPremium: false,
      roleSlugs: [],
    },
    {
      menuId: guestHomeLeft.id,
      label: 'Intake gesprek',
      href: '/portal/guest?p=intake-gesprek',
      sortOrder: 30,
      requiresPremium: false,
      roleSlugs: [],
    },
    {
      menuId: guestHomeLeft.id,
      label: 'Doelgroepen',
      href: '/portal/guest?p=doelgroepen',
      sortOrder: 40,
      requiresPremium: false,
      roleSlugs: [],
    },
    {
      menuId: guestHomeLeft.id,
      label: 'Veelgestelde vragen',
      href: '/portal/guest?p=veelgestelde-vragen',
      sortOrder: 50,
      requiresPremium: false,
      roleSlugs: [],
    },
    {
      menuId: guestHomeLeft.id,
      label: 'Testshoot',
      href: '/portal/guest?p=testshoot',
      sortOrder: 60,
      requiresPremium: false,
      roleSlugs: [],
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

  /** Gastenportaal links: vervang oude items zodat ze overeenkomen met de zijbalk (anders blijven verkeerde hrefs staan). */
  await prisma.menuItem.deleteMany({ where: { menuId: guestHomeLeft.id } });

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
    ['testshoot', 'Testshoot'],
    ['tijdelijke-uploads', 'Tijdelijke uploads'],
    ['setkaarten', 'Setkaarten'],
    ['portfolio-fotograaf', 'Portfolio (fotograaf → model)'],
    ['portfolio-divers', 'Portfolio (divers / geen model)'],
    ['fotomodeshow-klein', 'Foto modeshow (klein / ZIP)'],
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
      where: { key_locale: { key: c.key, locale: 'nl' } },
      update: { value: c.value, portal: c.portal ?? null },
      create: { key: c.key, value: c.value, locale: 'nl', portal: c.portal ?? undefined },
    });
  }

  const tsCount = await prisma.testshootModel.count();
  if (tsCount === 0) {
    await prisma.testshootModel.create({
      data: { name: 'Model 1', sortOrder: 0 },
    });
  }

  await seedAgenda(prisma);

  console.log('Seed OK. Demo-login (allemaal wachtwoord): Demo123!');
  console.log('  admin@class-models.local');
  console.log('  model@class-models.local');
  console.log('  klant@class-models.local');
  console.log('  fotograaf@class-models.local (portfolio-uploads)');
  console.log('Admin user id:', admin.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
