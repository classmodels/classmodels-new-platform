import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createWriteStream, mkdirSync, existsSync, unlinkSync, statSync, writeFileSync } from 'fs';
import { basename, extname, join } from 'path';
import { randomUUID } from 'crypto';
import { resolveMediaRoot } from '../config/resolve-media-root';
import { PrismaService } from '../prisma/prisma.service';
import sharp from 'sharp';
import { ModelPortalHistoryService } from '../portal/model-portal-history.service';

/**
 * Hosting: zo licht mogelijk (opslag + bandbreedte), nog aanvaardbaar voor web.
 * Het **originele uploadbestand** blijft op schijf; WebP + thumb zijn service-kopieën.
 */
const WEBP_FULL_QUALITY = 78;
const WEBP_THUMB_QUALITY = 72;
const WEBP_EFFORT = 4;
/** Primair JPEG i.p.v. zware RAW/PNG/WebP-opslag (hosting). */
const JPEG_PRIMARY_QUALITY = 82;

export type SaveFileOptions = {
  /** Extra stuk in weergavenaam, bv. model-slug: `class-models-jan-peeters-IMG.jpg` */
  fileLabel?: string;
};

export type MediaFolderSettings = {
  deleteDaysAfterModelDownload?: number;
  storeUploadsAsWebpOnly?: boolean;
};

export function parseMediaFolderSettings(raw: unknown): MediaFolderSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const d = o.deleteDaysAfterModelDownload;
  let deleteDaysAfterModelDownload: number | undefined;
  if (typeof d === 'number' && Number.isFinite(d) && d > 0) {
    deleteDaysAfterModelDownload = Math.min(Math.floor(d), 365);
  }
  const w = o.storeUploadsAsWebpOnly;
  const storeUploadsAsWebpOnly = typeof w === 'boolean' ? w : undefined;
  return { deleteDaysAfterModelDownload, storeUploadsAsWebpOnly };
}

function mergeMediaFolderSettings(
  existing: unknown,
  patch: { deleteDaysAfterModelDownload?: number; storeUploadsAsWebpOnly?: boolean },
): MediaFolderSettings {
  const cur = parseMediaFolderSettings(existing);
  const next: MediaFolderSettings = { ...cur };
  if (patch.deleteDaysAfterModelDownload !== undefined) {
    if (patch.deleteDaysAfterModelDownload <= 0) delete next.deleteDaysAfterModelDownload;
    else next.deleteDaysAfterModelDownload = Math.min(patch.deleteDaysAfterModelDownload, 365);
  }
  if (patch.storeUploadsAsWebpOnly !== undefined) {
    next.storeUploadsAsWebpOnly = patch.storeUploadsAsWebpOnly;
  }
  return next;
}

type AssetWithFolder = {
  storageKey: string;
  mimeType: string;
  webpKey?: string | null;
  thumbKey?: string | null;
  modelDownloadedAt?: Date | null;
  folder?: { slug: string; settings: unknown } | null;
};

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private modelHistory: ModelPortalHistoryService,
  ) {}

  root() {
    return resolveMediaRoot();
  }

  /** Publieke bestandsnaam die wél op schijf staat (thumb → webp → origineel). Voorkomt 404 als alleen thumb bestaat. */
  resolvePublicFilename(asset: {
    storageKey: string;
    webpKey?: string | null;
    thumbKey?: string | null;
  }): string {
    const root = this.root();
    for (const k of [asset.thumbKey, asset.webpKey, asset.storageKey]) {
      if (k && existsSync(join(root, k))) return k;
    }
    return asset.storageKey;
  }

  /** Grotere weergave: webp/full vóór thumbnail. */
  resolveDetailFilename(asset: {
    storageKey: string;
    mimeType: string;
    webpKey?: string | null;
    thumbKey?: string | null;
  }): string {
    const root = this.root();
    const image = asset.mimeType?.startsWith('image/');
    const order = image
      ? [asset.webpKey, asset.storageKey, asset.thumbKey]
      : [asset.storageKey, asset.webpKey, asset.thumbKey];
    for (const k of order) {
      if (k && existsSync(join(root, k))) return k;
    }
    return asset.storageKey;
  }

  /** Modelportaal: volledige resolutie tot eerste download, als map-policy dat vereist. */
  resolvePortalDetailKey(asset: AssetWithFolder): string {
    const folder = asset.folder;
    const s = parseMediaFolderSettings(folder?.settings);
    const policy =
      folder?.slug === 'models' &&
      typeof s.deleteDaysAfterModelDownload === 'number' &&
      s.deleteDaysAfterModelDownload > 0;
    if (policy && !asset.modelDownloadedAt && asset.mimeType.startsWith('image/')) {
      const root = this.root();
      if (existsSync(join(root, asset.storageKey))) return asset.storageKey;
    }
    return this.resolveDetailFilename(asset);
  }

  private slugLabel(raw: string | undefined): string {
    if (!raw?.trim()) return '';
    const s = raw
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 72);
    return s;
  }

  private buildDisplayOriginalName(
    file: Express.Multer.File,
    folder: { slug: string } | null | undefined,
    opts?: SaveFileOptions,
  ): string {
    const ext = (extname(file.originalname) || '').slice(1) || (file.originalname.split('.').pop() ?? 'bin');
    const baseRaw = basename(file.originalname, extname(file.originalname)) || 'bestand';
    const base = this.slugLabel(baseRaw).replace(/-/g, '_') || 'bestand';
    const label = this.slugLabel(opts?.fileLabel);

    let prefix = 'upload';
    if (folder?.slug === 'models') prefix = 'class-models';
    else if (folder?.slug === 'testshoot') prefix = 'testshoot';
    else if (folder?.slug) prefix = this.slugLabel(folder.slug) || 'upload';

    const mid = label || randomUUID().slice(0, 8);
    const name = `${prefix}-${mid}-${base}.${ext}`.replace(/-+/g, '-').slice(0, 190);
    return name;
  }

  async purgeScheduledAssets() {
    const now = new Date();
    const due = await this.prisma.mediaAsset.findMany({
      where: { scheduledHardDeleteAt: { lte: now }, hardDeleted: false },
      select: { id: true },
      take: 100,
    });
    for (const r of due) {
      try {
        await this.removeAsset(r.id, true);
      } catch {
        /* volgende */
      }
    }
  }

  async ensureDefaultFolders() {
    const defs: [string, string][] = [
      ['casting', 'Casting'],
      ['site', 'Site'],
      ['uploads', 'Uploads'],
      ['opdrachten', 'Opdrachten'],
      ['reviews', 'Reviews'],
      ['models', 'Modellen'],
      ['testshoot', 'Testshoot'],
    ];
    for (const [slug, label] of defs) {
      await this.prisma.mediaFolder.upsert({
        where: { slug },
        update: { label },
        create: { slug, label },
      });
    }

    const gf = await this.prisma.mediaFolder.upsert({
      where: { slug: 'gratis-fotoshoot' },
      update: { label: 'Gratis fotoshoot' },
      create: { slug: 'gratis-fotoshoot', label: 'Gratis fotoshoot' },
    });
    await this.prisma.mediaFolder.upsert({
      where: { slug: 'gratis-fotoshoot-documenten' },
      update: { label: 'Documenten (testshoot-feedback)', parentId: gf.id },
      create: {
        slug: 'gratis-fotoshoot-documenten',
        label: 'Documenten (testshoot-feedback)',
        parentId: gf.id,
      },
    });

    await this.prisma.mediaFolder.upsert({
      where: { slug: 'verwijderde' },
      update: { label: 'Verwijderde' },
      create: { slug: 'verwijderde', label: 'Verwijderde' },
    });

    return this.prisma.mediaFolder.findMany({ orderBy: { slug: 'asc' } });
  }

  async library() {
    await this.purgeScheduledAssets();
    const rows = await this.prisma.mediaFolder.findMany({
      orderBy: { slug: 'asc' },
      include: {
        assets: {
          where: { hardDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 200,
        },
      },
    });
    return rows.map((folder) => ({
      ...folder,
      assets: folder.assets.map((a) => ({
        ...a,
        publicKey: this.resolvePublicFilename(a),
        detailKey: this.resolveDetailFilename(a),
      })),
    }));
  }

  async saveFile(
    file: Express.Multer.File,
    userId: string,
    folderId?: string | null,
    opts?: SaveFileOptions,
  ) {
    await this.purgeScheduledAssets();
    const root = this.root();
    if (!existsSync(root)) mkdirSync(root, { recursive: true });
    const id = randomUUID();

    let folder: { slug: string; settings: unknown } | null = null;
    if (folderId) {
      folder = await this.prisma.mediaFolder.findUnique({
        where: { id: folderId },
        select: { slug: true, settings: true },
      });
    }
    const folderSettings = parseMediaFolderSettings(folder?.settings);
    /** Testshoot-zip gebruikt `storageKey`; altijd origineel bewaren, geen WebP-only. */
    const webpOnly = Boolean(
      folderSettings.storeUploadsAsWebpOnly &&
        file.mimetype.startsWith('image/') &&
        folder?.slug !== 'testshoot',
    );

    let width: number | undefined;
    let height: number | undefined;
    let webpKey: string | undefined;
    let thumbKey: string | undefined;
    let storageKey: string;
    let mimeType = file.mimetype;
    let sizeBytes = file.size;

    if (webpOnly) {
      storageKey = `${id}.webp`;
      const full = join(root, storageKey);
      await sharp(file.buffer)
        .rotate()
        .webp({
          quality: WEBP_FULL_QUALITY,
          effort: WEBP_EFFORT,
        })
        .toFile(full);
      const meta = await sharp(full).metadata();
      width = meta.width ?? undefined;
      height = meta.height ?? undefined;
      mimeType = 'image/webp';
      sizeBytes = statSync(full).size;
      thumbKey = `${id}_thumb.webp`;
      await sharp(full)
        .rotate()
        .resize(360, 360, { fit: 'inside' })
        .webp({
          quality: WEBP_THUMB_QUALITY,
          effort: WEBP_EFFORT,
        })
        .toFile(join(root, thumbKey));
    } else {
      const ext = file.originalname.split('.').pop() ?? 'bin';
      storageKey = `${id}.${ext}`;
      const full = join(root, storageKey);
      await new Promise<void>((resolve, reject) => {
        const ws = createWriteStream(full);
        ws.on('error', reject);
        ws.on('finish', () => resolve());
        ws.write(file.buffer);
        ws.end();
      });

      if (file.mimetype.startsWith('image/')) {
        const orientedMeta = await sharp(full).rotate().metadata();
        width = orientedMeta.width;
        height = orientedMeta.height;
        const webpQ = WEBP_FULL_QUALITY;
        webpKey = `${id}.webp`;
        await sharp(full)
          .rotate()
          .webp({
            quality: webpQ,
            effort: WEBP_EFFORT,
          })
          .toFile(join(root, webpKey));
        thumbKey = `${id}_thumb.webp`;
        await sharp(full)
          .rotate()
          .resize(360, 360, { fit: 'inside' })
          .webp({
            quality: WEBP_THUMB_QUALITY,
            effort: WEBP_EFFORT,
          })
          .toFile(join(root, thumbKey));
      }
    }

    const displayFile =
      webpOnly ?
        ({
          ...file,
          originalname: `${basename(file.originalname, extname(file.originalname)) || 'bestand'}.webp`,
        } as Express.Multer.File)
      : file;
    const displayOriginal = this.buildDisplayOriginalName(displayFile, folder ?? undefined, opts);

    const created = await this.prisma.mediaAsset.create({
      data: {
        originalName: displayOriginal,
        storageKey,
        mimeType,
        sizeBytes,
        width,
        height,
        webpKey,
        thumbKey,
        uploadedById: userId,
        folderId: folderId && folderId.length > 0 ? folderId : undefined,
      },
    });
    return {
      ...created,
      publicKey: this.resolvePublicFilename(created),
      detailKey: this.resolveDetailFilename(created),
    };
  }

  list() {
    return this.prisma.mediaAsset.findMany({
      where: { hardDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** Alleen portfolio in map `models` — nooit testshoot/site-copies in het modelportaal. */
  async listForUploader(userId: string) {
    await this.purgeScheduledAssets();
    const rows = await this.prisma.mediaAsset.findMany({
      where: {
        uploadedById: userId,
        hardDeleted: false,
        folder: { slug: 'models' },
      },
      include: { folder: { select: { slug: true, settings: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((a) => ({
      ...a,
      publicKey: this.resolvePublicFilename(a),
      detailKey: this.resolveDetailFilename(a),
      portalDetailKey: this.resolvePortalDetailKey(a as AssetWithFolder),
    }));
  }

  /** Modelportaal: standaard map `models` (slug). */
  async saveForPortalUser(
    file: Express.Multer.File,
    userId: string,
    folderSlug: string = 'models',
  ) {
    const folder = await this.prisma.mediaFolder.findUnique({
      where: { slug: folderSlug },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true },
    });
    const parts = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    const label =
      this.slugLabel(parts) ||
      (user?.email?.includes('@') ? this.slugLabel(user.email.split('@')[0] ?? '') : '');
    const created = await this.saveFile(file, userId, folder?.id ?? undefined, { fileLabel: label || undefined });
    if (folderSlug === 'models') {
      void this.modelHistory.log(userId, 'portfolio_photo_uploaded', {
        assetId: created.id,
        originalName: created.originalName,
      });
    }
    return created;
  }

  async modelAckPortfolioDownload(userId: string, assetId: string) {
    const a = await this.prisma.mediaAsset.findFirst({
      where: {
        id: assetId,
        uploadedById: userId,
        hardDeleted: false,
        folder: { slug: 'models' },
      },
      include: { folder: { select: { slug: true, settings: true } } },
    });
    if (!a) throw new NotFoundException();
    const s = parseMediaFolderSettings(a.folder?.settings);
    const days = s.deleteDaysAfterModelDownload;
    void this.modelHistory.log(userId, 'portfolio_download_ack', {
      assetId,
      originalName: a.originalName,
      scheduledDelete: typeof days === 'number' && days > 0,
      deleteAfterDays: typeof days === 'number' && days > 0 ? days : null,
    });
    if (days == null || days <= 0) {
      return { ok: true as const, scheduledDelete: false as const };
    }
    const now = new Date();
    const deadline = new Date(now.getTime() + days * 86400000);
    await this.prisma.mediaAsset.update({
      where: { id: assetId },
      data: {
        modelDownloadedAt: a.modelDownloadedAt ?? now,
        scheduledHardDeleteAt: a.scheduledHardDeleteAt ?? deadline,
      },
    });
    const until = (a.scheduledHardDeleteAt ?? deadline).toISOString();
    return { ok: true as const, scheduledDelete: true as const, scheduledHardDeleteAt: until };
  }

  async moveAssetsToTrash(ids: string[]) {
    await this.purgeScheduledAssets();
    const trash = await this.prisma.mediaFolder.findUnique({ where: { slug: 'verwijderde' } });
    if (!trash) throw new NotFoundException('Prullenbakmap ontbreekt. Gebruik “Standaardmappen”.');
    const uniq = [...new Set(ids)].filter(Boolean);
    if (!uniq.length) return { moved: 0 };
    const res = await this.prisma.mediaAsset.updateMany({
      where: {
        id: { in: uniq },
        hardDeleted: false,
        folderId: { not: trash.id },
      },
      data: {
        folderId: trash.id,
        scheduledHardDeleteAt: null,
        modelDownloadedAt: null,
      },
    });
    return { moved: res.count };
  }

  async emptyTrash() {
    await this.purgeScheduledAssets();
    const trash = await this.prisma.mediaFolder.findUnique({ where: { slug: 'verwijderde' } });
    if (!trash) throw new NotFoundException();
    const inTrash = await this.prisma.mediaAsset.findMany({
      where: { folderId: trash.id, hardDeleted: false },
      select: { id: true },
    });
    let deleted = 0;
    for (const x of inTrash) {
      try {
        await this.removeAsset(x.id, true);
        deleted++;
      } catch {
        /* volgende */
      }
    }
    return { deleted };
  }

  async updateFolderSettings(
    folderId: string,
    patch: { deleteDaysAfterModelDownload?: number; storeUploadsAsWebpOnly?: boolean },
  ) {
    const f = await this.prisma.mediaFolder.findUnique({ where: { id: folderId } });
    if (!f) throw new NotFoundException();
    if (f.slug === 'verwijderde') throw new BadRequestException('Instellingen voor de prullenbak zijn niet nodig.');
    const next = mergeMediaFolderSettings(f.settings, patch);
    return this.prisma.mediaFolder.update({
      where: { id: folderId },
      data: { settings: next as object },
    });
  }

  /** Opnieuw WebP + thumb genereren vanaf het primaire bestand (alleen afbeeldingen). */
  async reoptimizeFolderImages(folderId: string, limit = 40) {
    const folderRow = await this.prisma.mediaFolder.findUnique({ where: { id: folderId } });
    if (!folderRow) throw new NotFoundException();
    if (folderRow.slug === 'verwijderde') throw new BadRequestException();
    const root = this.root();
    const assets = await this.prisma.mediaAsset.findMany({
      where: { folderId, hardDeleted: false, mimeType: { startsWith: 'image/' } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    let done = 0;
    for (const a of assets) {
      const src = join(root, a.storageKey);
      if (!existsSync(src)) continue;
      const baseId = a.storageKey.includes('.') ? a.storageKey.replace(/\.[^.]+$/, '') : a.storageKey;
      const webpKey = `${baseId}.webp`;
      const thumbKey = `${baseId}_thumb.webp`;
      try {
        await sharp(src)
          .rotate()
          .webp({ quality: WEBP_FULL_QUALITY, effort: WEBP_EFFORT })
          .toFile(join(root, webpKey));
        await sharp(src)
          .rotate()
          .resize(360, 360, { fit: 'inside' })
          .webp({ quality: WEBP_THUMB_QUALITY, effort: WEBP_EFFORT })
          .toFile(join(root, thumbKey));
        await this.prisma.mediaAsset.update({
          where: { id: a.id },
          data: { webpKey, thumbKey },
        });
        done++;
      } catch {
        /* volgende */
      }
    }
    return { processed: done, scanned: assets.length };
  }

  /**
   * Primair bestand naar compact JPEG (`uuid.jpg`), daarna WebP + thumb opnieuw.
   * Verwijdert oude primaire extensie waar van toepassing — minder schijf dan grote PNG/WebP-only.
   */
  async convertFolderPrimaryToJpeg(folderId: string, limit = 40) {
    const folderRow = await this.prisma.mediaFolder.findUnique({ where: { id: folderId } });
    if (!folderRow) throw new NotFoundException();
    if (folderRow.slug === 'verwijderde') throw new BadRequestException();
    const root = this.root();
    const assets = await this.prisma.mediaAsset.findMany({
      where: { folderId, hardDeleted: false, mimeType: { startsWith: 'image/' } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    let done = 0;
    for (const a of assets) {
      const srcPath = join(root, a.storageKey);
      if (!existsSync(srcPath)) continue;
      const baseId = a.storageKey.includes('.') ? a.storageKey.replace(/\.[^.]+$/, '') : a.storageKey;
      const jpgKey = `${baseId}.jpg`;
      const newWebpKey = `${baseId}.webp`;
      const newThumbKey = `${baseId}_thumb.webp`;
      const oldStorage = a.storageKey;
      const oldWebp = a.webpKey;
      const oldThumb = a.thumbKey;
      try {
        const oriented = await sharp(srcPath).rotate().metadata();
        const w0 = oriented.width ?? undefined;
        const h0 = oriented.height ?? undefined;
        const jpgFull = join(root, jpgKey);
        const buf = await sharp(srcPath)
          .rotate()
          .jpeg({ quality: JPEG_PRIMARY_QUALITY, mozjpeg: true })
          .toBuffer();
        writeFileSync(jpgFull, buf);
        const jpgStat = statSync(jpgFull);

        await sharp(jpgFull)
          .rotate()
          .webp({ quality: WEBP_FULL_QUALITY, effort: WEBP_EFFORT })
          .toFile(join(root, newWebpKey));
        await sharp(jpgFull)
          .rotate()
          .resize(360, 360, { fit: 'inside' })
          .webp({ quality: WEBP_THUMB_QUALITY, effort: WEBP_EFFORT })
          .toFile(join(root, newThumbKey));

        if (oldStorage !== jpgKey && oldStorage !== newWebpKey && oldStorage !== newThumbKey) {
          try {
            unlinkSync(join(root, oldStorage));
          } catch {
            /* */
          }
        }
        for (const k of [oldWebp, oldThumb].filter(Boolean) as string[]) {
          if (k === newWebpKey || k === newThumbKey || k === jpgKey) continue;
          try {
            const p = join(root, k);
            if (existsSync(p)) unlinkSync(p);
          } catch {
            /* */
          }
        }

        await this.prisma.mediaAsset.update({
          where: { id: a.id },
          data: {
            storageKey: jpgKey,
            mimeType: 'image/jpeg',
            sizeBytes: jpgStat.size,
            width: w0,
            height: h0,
            webpKey: newWebpKey,
            thumbKey: newThumbKey,
          },
        });
        done++;
      } catch {
        /* volgende */
      }
    }
    return { processed: done, scanned: assets.length };
  }

  async removeAsset(id: string, hard: boolean) {
    const a = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!a) throw new NotFoundException();
    if (!hard) {
      return this.prisma.mediaAsset.update({
        where: { id },
        data: { hardDeleted: true },
      });
    }
    const root = this.root();
    for (const k of [a.storageKey, a.webpKey, a.thumbKey].filter(Boolean) as string[]) {
      try {
        unlinkSync(join(root, k));
      } catch {
        /* best effort */
      }
    }
    await this.prisma.mediaAsset.delete({ where: { id } });
    return { ok: true, hard: true };
  }
}
