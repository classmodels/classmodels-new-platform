/**
 * Hoofdfoto’s vanaf lokale bestanden (geen WordPress-download).
 * Manifest: JSON-array met { "email": "…", "image": "/absoluut/pad/foto.jpg" }
 *
 *   npx ts-node scripts/import-profile-photos-manifest.ts --manifest=/pad/photos.json --dry-run
 *   npx ts-node scripts/import-profile-photos-manifest.ts --manifest=/pad/photos.json --apply [--force]
 */
import * as fs from 'fs';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import { resolveMediaRoot } from '../src/config/resolve-media-root';

const prisma = new PrismaClient();

function argValue(name: string): string | undefined {
  const pref = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(pref));
  return hit ? hit.slice(pref.length) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function slugLabel(raw: string | undefined): string {
  if (!raw?.trim()) return '';
  return raw
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

async function saveImageFromBuffer(params: {
  buffer: Buffer;
  mimeType: string;
  userId: string;
  folderId: string;
  fileLabel: string;
}) {
  const root = resolveMediaRoot();
  mkdirSync(root, { recursive: true });
  const id = randomUUID();
  let ext = 'jpg';
  if (params.mimeType.includes('png')) ext = 'png';
  else if (params.mimeType.includes('webp')) ext = 'webp';
  else if (params.mimeType.includes('jpeg') || params.mimeType.includes('jpg')) ext = 'jpg';
  const storageKey = `${id}.${ext}`;
  const full = join(root, storageKey);
  await fs.promises.writeFile(full, params.buffer);

  let width: number | undefined;
  let height: number | undefined;
  let webpKey: string | undefined;
  let thumbKey: string | undefined;

  if (params.mimeType.startsWith('image/')) {
    const orientedMeta = await sharp(full).rotate().metadata();
    width = orientedMeta.width;
    height = orientedMeta.height;
    webpKey = `${id}.webp`;
    await sharp(full).rotate().webp({ quality: 82, effort: 4 }).toFile(join(root, webpKey));
    thumbKey = `${id}_thumb.webp`;
    await sharp(full)
      .rotate()
      .resize(360, 360, { fit: 'inside' })
      .webp({ quality: 78, effort: 4 })
      .toFile(join(root, thumbKey));
  }

  const parts = params.fileLabel.trim() || 'model';
  const displayOriginal = `class-models-${slugLabel(parts) || randomUUID().slice(0, 8)}-manifest.${ext}`.slice(0, 190);

  return prisma.mediaAsset.create({
    data: {
      originalName: displayOriginal,
      storageKey,
      mimeType: params.mimeType,
      sizeBytes: params.buffer.length,
      width,
      height,
      webpKey,
      thumbKey,
      uploadedById: params.userId,
      folderId: params.folderId,
    },
  });
}

type ManifestRow = { email: string; image: string };

async function main() {
  const manifestPath = argValue('manifest');
  const dryRun = hasFlag('dry-run');
  const apply = hasFlag('apply');
  const force = hasFlag('force');
  if (!manifestPath) {
    console.error('Gebruik: --manifest=/pad/photos.json  met inhoud bv. [{"email":"a@b.be","image":"/pad/foto.jpg"}]');
    process.exit(1);
  }
  if (!apply && !dryRun) {
    console.error('Geef --dry-run of --apply');
    process.exit(1);
  }
  const abs = fs.existsSync(manifestPath) ? manifestPath : join(process.cwd(), manifestPath);
  if (!fs.existsSync(abs)) {
    console.error(`Manifest niet gevonden: ${abs}`);
    process.exit(1);
  }
  const rows = JSON.parse(fs.readFileSync(abs, 'utf8')) as ManifestRow[];
  if (!Array.isArray(rows)) {
    console.error('Manifest moet een JSON-array zijn.');
    process.exit(1);
  }

  const folder = await prisma.mediaFolder.findUnique({ where: { slug: 'models' } });
  if (!folder) {
    console.error('MediaFolder "models" ontbreekt. Run db:seed.');
    process.exit(1);
  }

  let ok = 0;
  let skip = 0;
  let err = 0;

  for (const row of rows) {
    const email = (row.email || '').toLowerCase().trim();
    const imagePath = (row.image || '').trim();
    if (!email || !imagePath) {
      skip++;
      continue;
    }
    if (!fs.existsSync(imagePath)) {
      console.warn(`Bestand ontbreekt: ${imagePath} (${email})`);
      err++;
      continue;
    }
    const u = await prisma.user.findUnique({
      where: { email },
      select: { id: true, firstName: true, lastName: true, profilePhotoAssetId: true },
    });
    if (!u) {
      console.warn(`Geen user: ${email}`);
      skip++;
      continue;
    }
    if (u.profilePhotoAssetId && !force) {
      skip++;
      continue;
    }
    const buf = await fs.promises.readFile(imagePath);
    const meta = await sharp(buf).rotate().metadata();
    const mime = meta.format === 'png' ? 'image/png' : meta.format === 'webp' ? 'image/webp' : 'image/jpeg';
    const label = [u.firstName, u.lastName].filter(Boolean).join(' ') || email.split('@')[0] || 'model';
    try {
      if (dryRun) {
        console.log(`WOULD ${email} ← ${imagePath}`);
        ok++;
        continue;
      }
      const asset = await saveImageFromBuffer({
        buffer: buf,
        mimeType: mime,
        userId: u.id,
        folderId: folder.id,
        fileLabel: label,
      });
      await prisma.user.update({
        where: { id: u.id },
        data: { profilePhotoAssetId: asset.id },
      });
      ok++;
      console.log(`OK ${email} → ${asset.id}`);
    } catch (e) {
      err++;
      console.warn(`${email}: ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log(JSON.stringify({ dryRun, apply, ok, skip, err, total: rows.length, mediaRoot: resolveMediaRoot() }, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
