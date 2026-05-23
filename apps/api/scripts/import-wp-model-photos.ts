/**
 * Leest wp-models-export.json (met hoofdfotoUrl/profielfotoUrl van wp-export-class-models.php)
 * en importeert één hoofdfoto per model als MediaAsset + User.profilePhotoAssetId.
 * Importeert ook extra beelden uit meta.cm_galerijfotos (WP attachment-ID's) als MediaAsset in map `models`
 * (zelfde bron als modellenportaal-galerij; hoofd-id wordt niet dubbel geïmporteerd).
 *
 * apps/api: npx ts-node scripts/import-wp-model-photos.ts --file=/pad/wp-models-export.json --dry-run
 *            npx ts-node scripts/import-wp-model-photos.ts --file=... --apply
 *            --file=wp-models-export.json  (naast monorepo-root: ../../ vanaf apps/api)
 *            --force  overschrijft bestaande profilePhotoAssetId
 *            --skip-gallery  alleen hoofdfoto, geen cm_galerijfotos
 *
 * Zonder hoofdfotoUrl in JSON: als users[].meta cm_hoofdfoto / cm_profielfoto (attachment-ID) hebben,
 * wordt de bron-URL opgehaald via WP REST: {wpBaseUrl}wp-json/wp/v2/media/{id}
 * (wpBaseUrl uit JSON of expliciet: --wp-base-url=https://jouwsite.be/)
 */
import * as fs from 'fs';
import { mkdirSync } from 'fs';
import { isAbsolute, join } from 'path';
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

function mediaRoot(): string {
  return resolveMediaRoot();
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
  const root = mediaRoot();
  mkdirSync(root, { recursive: true });
  const id = randomUUID();
  const storageKey = `${id}.webp`;
  const full = join(root, storageKey);
  await sharp(params.buffer)
    .rotate()
    .webp({ quality: 78, effort: 4 })
    .toFile(full);
  const meta = await sharp(full).metadata();
  const width = meta.width ?? undefined;
  const height = meta.height ?? undefined;
  const thumbKey = `${id}_thumb.webp`;
  await sharp(full)
    .rotate()
    .resize(360, 360, { fit: 'inside' })
    .webp({ quality: 72, effort: 4 })
    .toFile(join(root, thumbKey));
  const sizeBytes = (await fs.promises.stat(full)).size;

  const parts = params.fileLabel.trim() || 'model';
  const displayOriginal = `class-models-${slugLabel(parts) || randomUUID().slice(0, 8)}-wp-import.webp`.slice(
    0,
    190,
  );

  return prisma.mediaAsset.create({
    data: {
      originalName: displayOriginal,
      storageKey,
      mimeType: 'image/webp',
      sizeBytes,
      width,
      height,
      webpKey: null,
      thumbKey,
      uploadedById: params.userId,
      folderId: params.folderId,
    },
  });
}

async function fetchBuffer(url: string): Promise<{ buffer: Buffer; mime: string }> {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      Accept: 'image/*,*/*;q=0.8',
      'User-Agent': 'ClassModelsWpPhotoImport/1.0',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const mime = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
  const buf = Buffer.from(await res.arrayBuffer());
  return { buffer: buf, mime };
}

type WpRow = {
  wpUserId: number;
  user_email: string;
  hoofdfotoUrl?: string;
  profielfotoUrl?: string;
  meta?: Record<string, unknown>;
  /** Nieuw in export (PHP): directe URL's per galerij-attachment; geen WP REST nodig. */
  galerijfotos?: { id: number; url: string }[];
};

/** Galerij-items: voorkeur `galerijfotos` uit export; anders ID's uit meta + REST. */
function galleryItemsForUser(w: WpRow): { id: number; url: string }[] {
  const fromExport = w.galerijfotos;
  if (Array.isArray(fromExport) && fromExport.length) {
    return fromExport
      .map((x) => ({
        id: typeof x.id === 'number' ? x.id : parseInt(String(x.id), 10),
        url: typeof x.url === 'string' ? x.url.trim() : '',
      }))
      .filter((x) => x.id > 0 && x.url.length > 0);
  }
  return metaGalleryAttachmentIds(w.meta).map((id) => ({ id, url: '' }));
}

type WpExportFile = {
  wpBaseUrl?: string;
  users?: WpRow[];
};

function normalizeWpBase(base: string): string {
  const t = base.trim();
  if (!t) return '';
  return t.endsWith('/') ? t : `${t}/`;
}

function metaAttachmentId(meta: Record<string, unknown> | undefined, key: string): number | null {
  if (!meta || !(key in meta)) return null;
  const v = meta[key];
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.floor(v);
  if (typeof v === 'string' && /^\d+$/.test(v.trim())) return parseInt(v.trim(), 10);
  if (Array.isArray(v)) {
    for (const x of v) {
      if (typeof x === 'number' && Number.isFinite(x) && x > 0) return Math.floor(x);
      if (typeof x === 'string' && /^\d+$/.test(x.trim())) return parseInt(x.trim(), 10);
    }
  }
  return null;
}

/** Eerste attachment-ID uit galerij als er geen hoofd-/profielfoto is. */
function metaFirstGalleryId(meta: Record<string, unknown> | undefined): number | null {
  const ids = metaGalleryAttachmentIds(meta);
  return ids.length ? ids[0]! : null;
}

/** WordPress-attachment-ID's uit `cm_galerijfotos` (array), uniek, volgorde behouden. */
function metaGalleryAttachmentIds(meta: Record<string, unknown> | undefined): number[] {
  if (!meta || !('cm_galerijfotos' in meta)) return [];
  const v = meta.cm_galerijfotos;
  if (!Array.isArray(v)) return [];
  const out: number[] = [];
  for (const x of v) {
    if (typeof x === 'number' && Number.isFinite(x) && x > 0) out.push(Math.floor(x));
    else if (typeof x === 'string' && /^\d+$/.test(x.trim())) out.push(parseInt(x.trim(), 10));
  }
  const seen = new Set<number>();
  const uniq: number[] = [];
  for (const id of out) {
    if (seen.has(id)) continue;
    seen.add(id);
    uniq.push(id);
  }
  return uniq;
}

/** WP attachment-ID die als profielfoto geldt (om dubbele download in galerij te vermijden). */
function profileWpAttachmentId(meta: Record<string, unknown> | undefined): number | null {
  const h = metaAttachmentId(meta, 'cm_hoofdfoto');
  const p = metaAttachmentId(meta, 'cm_profielfoto');
  if (h) return h;
  if (p) return p;
  const ids = metaGalleryAttachmentIds(meta);
  return ids.length ? ids[0]! : null;
}

function resolveExportFilePath(file: string): string {
  const candidates = [
    isAbsolute(file) ? file : join(process.cwd(), file),
    join(process.cwd(), '..', file),
    join(process.cwd(), '..', '..', file),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0]!;
}

async function wpRestMediaSourceUrl(
  base: string,
  mediaId: number,
  verbose: boolean,
  emailForLog: string,
): Promise<string | null> {
  const b = normalizeWpBase(base);
  if (!b || !mediaId) return null;
  const candidates = [
    `${b}wp-json/wp/v2/media/${mediaId}?context=view`,
    `${b}index.php?rest_route=/wp/v2/media/${mediaId}`,
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ClassModelsWpPhotoImport/1.0',
        },
      });
      if (!res.ok) {
        if (verbose) console.warn(`REST ${res.status} ${emailForLog} ← ${url.slice(0, 120)}`);
        continue;
      }
      const j = (await res.json()) as { source_url?: string; code?: string };
      if (j.code && verbose) console.warn(`REST body error ${emailForLog}: ${j.code}`);
      const src = j.source_url?.trim();
      if (src) return src;
    } catch (e) {
      if (verbose) console.warn(`REST fetch ${emailForLog}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return null;
}

async function resolveImageUrl(
  w: WpRow,
  wpBaseFromArg: string,
  wpBaseFromFile: string,
  verbose: boolean,
  email: string,
): Promise<{ url: string; via: 'json' | 'rest' } | null> {
  const direct = (w.hoofdfotoUrl || '').trim() || (w.profielfotoUrl || '').trim();
  if (direct) return { url: direct, via: 'json' };

  const base = (wpBaseFromArg || wpBaseFromFile || '').trim();
  const meta = w.meta;
  const hoofd = metaAttachmentId(meta, 'cm_hoofdfoto');
  const prof = metaAttachmentId(meta, 'cm_profielfoto');
  const galleryFirst = metaFirstGalleryId(meta);
  const id = hoofd || prof || galleryFirst;
  if (!base || !id) return null;
  const resolved = await wpRestMediaSourceUrl(base, id, verbose, email);
  return resolved ? { url: resolved, via: 'rest' } : null;
}

async function main() {
  const file = argValue('file');
  const wpBaseArg = argValue('wp-base-url') ?? '';
  const dryRun = hasFlag('dry-run');
  const apply = hasFlag('apply');
  const force = hasFlag('force');
  const verbose = hasFlag('verbose');
  const skipGallery = hasFlag('skip-gallery');
  if (!file) {
    console.error(
      'Gebruik: --file=/pad/wp-models-export.json [--dry-run] | [--apply] [--force] [--wp-base-url=https://site/] [--verbose] [--skip-gallery]',
    );
    process.exit(1);
  }
  if (!apply && !dryRun) {
    console.error('Geef --dry-run of --apply');
    process.exit(1);
  }

  const abs = resolveExportFilePath(file);
  if (!fs.existsSync(abs)) {
    console.error(`Bestand niet gevonden: ${abs}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(abs, 'utf8')) as WpExportFile;
  const users = raw.users ?? [];
  const wpBaseFile = (raw.wpBaseUrl || '').trim();
  const folder = await prisma.mediaFolder.findUnique({ where: { slug: 'models' } });
  if (!folder) {
    console.error('MediaFolder "models" ontbreekt. Start de API een keer of seed.');
    process.exit(1);
  }

  let okProfile = 0;
  let okGallery = 0;
  let skip = 0;
  let errProfile = 0;
  let errGallery = 0;
  let resolvedViaRest = 0;
  const skipWhy: Record<string, number> = {
    no_email: 0,
    no_user_in_db: 0,
    no_profile_url: 0,
    has_photo_no_force: 0,
    gallery_skip_profile_dup: 0,
    gallery_no_rest_url: 0,
    gallery_no_wp_base: 0,
  };
  const mediaDir = mediaRoot();
  if (verbose) {
    console.warn(`MEDIA_ROOT → ${mediaDir} (schrijf hier naartoe; zelfde logica als de API)`);
  }

  const throttle = async () => {
    if (apply) await new Promise((r) => setTimeout(r, 40));
  };

  for (const w of users) {
    const email = (w.user_email || '').toLowerCase().trim();
    if (!email) {
      skipWhy.no_email++;
      skip++;
      continue;
    }

    const u = await prisma.user.findUnique({
      where: { email },
      select: { id: true, firstName: true, lastName: true, profilePhotoAssetId: true },
    });
    if (!u) {
      skipWhy.no_user_in_db++;
      if (verbose || skipWhy.no_user_in_db <= 5) console.warn(`Geen user voor ${email}, skip`);
      skip++;
      continue;
    }

    const resolved = await resolveImageUrl(w, wpBaseArg, wpBaseFile, verbose, email || `#${w.wpUserId}`);
    const url = resolved?.url ?? '';
    if (resolved?.via === 'rest') resolvedViaRest++;

    const label = [u.firstName, u.lastName].filter(Boolean).join(' ') || email.split('@')[0] || 'model';

    if (url) {
      if (u.profilePhotoAssetId && !force) {
        skipWhy.has_photo_no_force++;
      } else {
        try {
          if (dryRun) {
            console.log(
              `WOULD profile ${email} [${resolved?.via ?? 'json'}] (${url.slice(0, 96)}${url.length > 96 ? '…' : ''})`,
            );
            okProfile++;
          } else {
            const { buffer, mime } = await fetchBuffer(url);
            await throttle();
            if (!mime.startsWith('image/')) {
              console.warn(`Geen afbeelding (profile) voor ${email}: ${mime}`);
              errProfile++;
            } else {
              const asset = await saveImageFromBuffer({
                buffer,
                mimeType: mime,
                userId: u.id,
                folderId: folder.id,
                fileLabel: label,
              });
              await prisma.user.update({
                where: { id: u.id },
                data: { profilePhotoAssetId: asset.id },
              });
              okProfile++;
              console.log(`OK profile ${email} → ${asset.id}`);
            }
          }
        } catch (e) {
          errProfile++;
          console.warn(`profile ${email}: ${e instanceof Error ? e.message : e}`);
        }
      }
    } else {
      skipWhy.no_profile_url++;
    }

    if (skipGallery) continue;

    const galleryItems = galleryItemsForUser(w);
    if (!galleryItems.length) continue;

    const profileWpId = profileWpAttachmentId(w.meta);
    const base = (wpBaseArg || wpBaseFile || '').trim();

    for (const { id: gid, url: directGalleryUrl } of galleryItems) {
      if (gid === profileWpId) {
        skipWhy.gallery_skip_profile_dup++;
        continue;
      }
      if (dryRun) {
        console.log(`WOULD gallery ${email} wp#${gid}`);
        okGallery++;
        continue;
      }
      try {
        const gUrl =
          directGalleryUrl.trim() !== ''
            ? directGalleryUrl.trim()
            : base
              ? await wpRestMediaSourceUrl(base, gid, verbose, email)
              : null;
        if (!gUrl) {
          if (!directGalleryUrl.trim() && !base) skipWhy.gallery_no_wp_base++;
          else skipWhy.gallery_no_rest_url++;
          continue;
        }
        const { buffer, mime } = await fetchBuffer(gUrl);
        await throttle();
        if (!mime.startsWith('image/')) {
          console.warn(`Geen afbeelding (gallery wp#${gid}) voor ${email}: ${mime}`);
          errGallery++;
          continue;
        }
        await saveImageFromBuffer({
          buffer,
          mimeType: mime,
          userId: u.id,
          folderId: folder.id,
          fileLabel: `${label}-g${gid}`,
        });
        okGallery++;
      } catch (e) {
        errGallery++;
        console.warn(`gallery ${email} wp#${gid}: ${e instanceof Error ? e.message : e}`);
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        apply,
        okProfile,
        okGallery,
        errProfile,
        errGallery,
        skip,
        totalUsers: users.length,
        resolvedViaRest,
        skipGallery,
        wpBaseUsed: normalizeWpBase(wpBaseArg || wpBaseFile) || null,
        mediaRootUsed: mediaDir,
        skipWhy,
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
