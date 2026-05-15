'use strict';
/** Na migrate: basisrollen + optioneel admin (zonder ts-node seed). */
const fs = require('fs');
const path = require('path');

const ROLES = [
  { slug: 'admin', label: 'Administrator', permissions: ['*'] },
  { slug: 'fotograaf', label: 'Fotograaf', permissions: ['photographer.portfolio.upload'] },
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

function loadPrismaClient(root) {
  const apiDir = path.join(root, 'apps', 'api');
  const clientPkg = path.join(apiDir, 'node_modules', '@prisma', 'client');
  const fallback = path.join(root, 'node_modules', '@prisma', 'client');
  const mod = require(fs.existsSync(clientPkg) ? clientPkg : fallback);
  return mod.PrismaClient;
}

async function runCombellBootstrapDb(root) {
  if (process.env.COMBELL_SKIP_DB_BOOTSTRAP === '1') {
    console.error('[combell] db bootstrap overgeslagen (COMBELL_SKIP_DB_BOOTSTRAP=1)');
    return true;
  }
  if (!process.env.DB_URL?.trim() && !process.env.DATABASE_URL?.trim()) {
    console.error('[combell] db bootstrap overgeslagen: DB_URL ontbreekt');
    return false;
  }

  let PrismaClient;
  try {
    PrismaClient = loadPrismaClient(root);
  } catch (e) {
    console.error('[combell] Prisma client niet geladen:', e.message || e);
    return false;
  }

  const prisma = new PrismaClient();
  try {
    for (const r of ROLES) {
      await prisma.role.upsert({
        where: { slug: r.slug },
        update: { label: r.label, permissions: r.permissions },
        create: r,
      });
    }
    console.error('[combell] rollen OK (' + ROLES.length + ')');

    const adminEmail = (
      process.env.COMBELL_BOOTSTRAP_ADMIN_EMAIL || 'admin@class-models.local'
    )
      .toLowerCase()
      .trim();
    const adminPass = process.env.COMBELL_BOOTSTRAP_ADMIN_PASSWORD || 'Demo123!';
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(adminPass, 10);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        passwordHash: hash,
        firstName: 'Admin',
        lastName: 'Class Models',
        defaultPortal: 'guest',
        status: 'active',
        roles: { create: [{ role: { connect: { slug: 'admin' } } }] },
      },
    });
    console.error('[combell] admin-account:', adminEmail);
    return true;
  } catch (e) {
    console.error('[combell] db bootstrap MISLUKT:', e.message || e);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { runCombellBootstrapDb };
