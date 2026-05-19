import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createReadStream,
  createWriteStream,
  mkdirSync,
  existsSync,
  unlinkSync,
  renameSync,
  statSync,
  writeFileSync,
  readdirSync,
  accessSync,
  constants as fsConstants,
} from 'fs';
import type { Dirent } from 'fs';
import { basename, extname, join, resolve } from 'path';
import { spawnSync } from 'child_process';
import { pipeline } from 'stream/promises';
import type { Response } from 'express';
import archiver from 'archiver';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { countMediaFilesShallow, resolveMediaRoot } from '../config/resolve-media-root';
import { PrismaService } from '../prisma/prisma.service';
import sharp from 'sharp';
import { ModelPortalHistoryService } from '../portal/model-portal-history.service';
import {
  assertModeshowDownloadsAvailable,
  modeshowDownloadsAvailableFrom,
  modeshowFilmOriginalName,
  modeshowPhotosFolderSlug,
} from '../portal/modeshow-downloads.config';

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
  /** Fotograaf: koppel levering aan dit model (map `portfolio-fotograaf`). */
  linkedModelUserId?: string | null;
};

export type MediaFolderSettings = {
  deleteDaysAfterModelDownload?: number;
  storeUploadsAsWebpOnly?: boolean;
  /** Publieke link: GET /media/folder/{slug}/download.zip */
  publicZipDownload?: boolean;
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
  const p = o.publicZipDownload;
  const publicZipDownload = typeof p === 'boolean' ? p : undefined;
  return { deleteDaysAfterModelDownload, storeUploadsAsWebpOnly, publicZipDownload };
}

function mergeMediaFolderSettings(
  existing: unknown,
  patch: {
    deleteDaysAfterModelDownload?: number;
    storeUploadsAsWebpOnly?: boolean;
    publicZipDownload?: boolean;
  },
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
  if (patch.publicZipDownload !== undefined) {
    next.publicZipDownload = patch.publicZipDownload;
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
  /** Cache: basename → pad relatief t.o.v. MEDIA_ROOT (lege map = geen cache). */
  private diskBasenameIndex: { root: string; map: Map<string, string> } | null = null;

  constructor(
    private prisma: PrismaService,
    private modelHistory: ModelPortalHistoryService,
  ) {}

  private invalidateDiskBasenameIndex() {
    this.diskBasenameIndex = null;
  }

  /** Uitleg + typische hosting-stappen bij EACCES op MEDIA_ROOT. */
  private mediaRootWriteDeniedUserMessage(root: string): string {
    return [
      `Geen schrijfrecht op MEDIA_ROOT (${root}).`,
      'De gebruiker waarmee de API (Node.js) draait moet in die map mogen schrijven — anders falen testshoot-uploads en de mediatheek.',
      'Oplossing op de server: via SSH bijvoorbeeld `sudo chown -R <api-gebruiker>:<api-gebruiker> ' +
        root +
        '` en `chmod -R u+rwX ' +
        root +
        '`, of stel dezelfde rechten in via het hosting-File Manager.',
      'Alternatief: zet de omgevingsvariabele MEDIA_ROOT naar een andere map waar de API-procesgebruiker wél schrijft (persistent pad, zie docs/MEDIA.md).',
    ].join(' ');
  }

  /** Zorgt dat uploads kunnen schrijven; anders duidelijke 400 i.p.v. generieke 500. */
  private ensureMediaRootWritable(root: string) {
    try {
      if (!existsSync(root)) {
        mkdirSync(root, { recursive: true });
      }
      if (!existsSync(root)) {
        throw new BadRequestException(
          `MEDIA_ROOT bestaat niet en kon niet aangemaakt worden: ${root}. Zet MEDIA_ROOT op het absolute pad van je uploads-map (zoals in Combell file manager).`,
        );
      }
      accessSync(root, fsConstants.W_OK);
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      const code = e && typeof e === 'object' && 'code' in e ? (e as NodeJS.ErrnoException).code : undefined;
      if (code === 'EACCES' || code === 'EPERM') {
        throw new BadRequestException(this.mediaRootWriteDeniedUserMessage(root));
      }
      if (code === 'ENOENT') {
        throw new BadRequestException(
          `MEDIA_ROOT-map ontbreekt: ${root}. Controleer het pad in je server-omgeving.`,
        );
      }
      throw new BadRequestException(
        `MEDIA_ROOT niet bruikbaar (${root}): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /** Bestand in submap van MEDIA_ROOT: relatief pad, of null. */
  lookupDiskRelativePath(fileBase: string): string | null {
    if (!fileBase || fileBase.includes('/') || fileBase.includes('..')) return null;
    const root = this.root();
    if (!this.diskBasenameIndex || this.diskBasenameIndex.root !== root) {
      this.diskBasenameIndex = { root, map: this.buildDiskBasenameIndex(root) };
    }
    return this.diskBasenameIndex.map.get(fileBase) ?? null;
  }

  private buildDiskBasenameIndex(root: string): Map<string, string> {
    const m = new Map<string, string>();
    let visited = 0;
    const maxVisit = 50000;
    const maxDepth = 14;
    const walk = (dir: string, relFromRoot: string, depth: number) => {
      if (depth > maxDepth || visited >= maxVisit) return;
      let ents: Dirent[];
      try {
        ents = readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of ents) {
        visited += 1;
        if (visited >= maxVisit) return;
        const subRel = relFromRoot ? `${relFromRoot}/${e.name}` : e.name;
        if (e.isFile()) {
          if (!m.has(e.name)) m.set(e.name, subRel);
        } else if (e.isDirectory()) {
          walk(join(dir, e.name), subRel, depth + 1);
        }
      }
    };
    try {
      walk(root, '', 0);
    } catch {
      /**/
    }
    return m;
  }

  /** Absoluut pad voor GET /media/public/:bestand (ook in submappen van MEDIA_ROOT). */
  resolveAbsolutePathForPublicFilename(filename: string): string | null {
    const safe = basename(filename);
    if (!safe || safe === '.') return null;
    const root = this.root();
    const direct = join(root, safe);
    if (existsSync(direct)) return direct;
    const rel = this.lookupDiskRelativePath(safe);
    if (!rel) return null;
    const nested = join(root, rel);
    return existsSync(nested) ? nested : null;
  }

  root() {
    return resolveMediaRoot();
  }

  /** Alleen schijf (geen nieuw DB-record): herstel mediabestanden op productie met zelfde bestandsnaam als in DB. */
  async putDiskFile(file: Express.Multer.File, filename: string) {
    const safe = basename(filename);
    if (!safe || safe === '.' || safe.includes('..') || !/^[a-zA-Z0-9._-]+$/.test(safe)) {
      throw new BadRequestException('Ongeldige bestandsnaam');
    }
    const hasBuffer = Buffer.isBuffer(file.buffer) && file.buffer.length > 0;
    if (!hasBuffer) throw new BadRequestException('Leeg bestand');
    const root = this.root();
    if (!existsSync(root)) mkdirSync(root, { recursive: true });
    const full = join(root, safe);
    writeFileSync(full, file.buffer);
    this.invalidateDiskBasenameIndex();
    return { ok: true, filename: safe };
  }

  /** Publieke bestandsnaam die wél op schijf staat (thumb → webp → origineel). Voorkomt 404 als alleen thumb bestaat. */
  resolvePublicFilename(asset: {
    storageKey: string;
    webpKey?: string | null;
    thumbKey?: string | null;
  }): string {
    const root = this.root();
    for (const k of [asset.thumbKey, asset.webpKey, asset.storageKey]) {
      if (!k) continue;
      if (existsSync(join(root, k))) return k;
      const rel = this.lookupDiskRelativePath(basename(k));
      if (rel) return basename(k);
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
      if (!k) continue;
      if (existsSync(join(root, k))) return k;
      const rel = this.lookupDiskRelativePath(basename(k));
      if (rel) return basename(k);
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
      if (this.lookupDiskRelativePath(basename(asset.storageKey))) return basename(asset.storageKey);
    }
    return this.resolveDetailFilename(asset);
  }

  /** Zorgt dat map `verwijderde` bestaat (zelfde als knop “Standaardmappen”). */
  private async ensureTrashFolder() {
    let trash = await this.prisma.mediaFolder.findUnique({ where: { slug: 'verwijderde' } });
    if (!trash) {
      await this.ensureDefaultFolders();
      trash = await this.prisma.mediaFolder.findUnique({ where: { slug: 'verwijderde' } });
    }
    if (!trash) {
      throw new NotFoundException(
        'Prullenbakmap kon niet aangemaakt worden. Probeer “Standaardmappen” of controleer de database.',
      );
    }
    return trash;
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

    const extraFolders: [string, string][] = [
      ['tijdelijke-uploads', 'Tijdelijke uploads'],
      ['portfolio-fotograaf', 'Portfolio (fotograaf → model)'],
      ['portfolio-divers', 'Portfolio (divers / geen model)'],
    ];
    for (const [slug, label] of extraFolders) {
      await this.prisma.mediaFolder.upsert({
        where: { slug },
        update: { label },
        create: { slug, label },
      });
    }

    return this.prisma.mediaFolder.findMany({ orderBy: { slug: 'asc' } });
  }

  /** Nieuwe lege map (slug uniek, afgeleid van label). */
  async createFolder(rawLabel: string) {
    const trimmed = rawLabel.trim();
    if (!trimmed) {
      throw new BadRequestException('Mapnaam is verplicht.');
    }
    let base = this.slugLabel(trimmed);
    if (!base) {
      base = `map-${randomUUID().slice(0, 8)}`;
    }
    let slug = base;
    let n = 2;
    while (await this.prisma.mediaFolder.findUnique({ where: { slug } })) {
      slug = `${base}-${n}`;
      n += 1;
      if (n > 200) {
        throw new BadRequestException('Kon geen unieke map-slug genereren.');
      }
    }
    return this.prisma.mediaFolder.create({
      data: { slug, label: trimmed, settings: {} },
    });
  }

  /**
   * Volledige boom per map (max. 200 assets/map) — o.a. voor `ContainerMediaPicker` (`?legacy=1`).
   */
  async libraryLegacy() {
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

  /**
   * Admin mediatheek: alle mappen met tellingen; assets alleen voor één map, gepagineerd.
   */
  async libraryPaginated(
    folderId: string | undefined,
    rawPage: number,
    rawPageSize: number,
  ) {
    await this.purgeScheduledAssets();
    const take = Math.min(120, Math.max(12, Number.isFinite(rawPageSize) ? rawPageSize : 72));
    const page = Math.max(1, Number.isFinite(rawPage) ? Math.floor(rawPage) : 1);

    const foldersMeta = await this.prisma.mediaFolder.findMany({
      orderBy: { slug: 'asc' },
      select: {
        id: true,
        slug: true,
        label: true,
        settings: true,
        _count: { select: { assets: { where: { hardDeleted: false } } } },
      },
    });

    if (foldersMeta.length === 0) {
      return {
        folders: [],
        folderId: '',
        page: 1,
        pageSize: take,
        totalAssets: 0,
        totalAllBytes: 0,
      };
    }

    const bytesAgg = await this.prisma.mediaAsset.aggregate({
      where: { hardDeleted: false },
      _sum: { sizeBytes: true },
    });
    const totalAllBytes = Number(bytesAgg._sum.sizeBytes ?? 0);

    const byId = new Map(foldersMeta.map((f) => [f.id, f]));
    const target =
      folderId && byId.has(folderId) ?
        folderId
      : foldersMeta.find((f) => f.slug === 'models')?.id ?? foldersMeta[0]!.id;

    const totalAssets = await this.prisma.mediaAsset.count({
      where: { folderId: target, hardDeleted: false },
    });

    const maxPage = Math.max(1, Math.ceil(totalAssets / take));
    const currentPage = Math.min(page, maxPage);
    const skip = (currentPage - 1) * take;

    const assetRows = await this.prisma.mediaAsset.findMany({
      where: { folderId: target, hardDeleted: false },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    const mappedAssets = assetRows.map((a) => ({
      ...a,
      publicKey: this.resolvePublicFilename(a),
      detailKey: this.resolveDetailFilename(a),
    }));

    const folders = foldersMeta.map((f) => ({
      id: f.id,
      slug: f.slug,
      label: f.label,
      settings: f.settings,
      assetCount: f._count.assets,
      assets: f.id === target ? mappedAssets : [],
    }));

    return {
      folders,
      folderId: target,
      page: currentPage,
      pageSize: take,
      totalAssets,
      totalAllBytes,
    };
  }

  /** Platte JSON-response na upload (vermijdt Prisma-proxy / serialisatie-surprises in productie). */
  private uploadResponseDto(created: {
    id: string;
    originalName: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
    webpKey: string | null;
    thumbKey: string | null;
    folderId: string | null;
    linkedModelUserId: string | null;
    uploadedById: string | null;
    modelDownloadedAt: Date | null;
    scheduledHardDeleteAt: Date | null;
    hardDeleted: boolean;
    createdAt: Date;
  }) {
    return {
      id: created.id,
      originalName: created.originalName,
      storageKey: created.storageKey,
      mimeType: created.mimeType,
      sizeBytes: created.sizeBytes,
      width: created.width,
      height: created.height,
      webpKey: created.webpKey,
      thumbKey: created.thumbKey,
      folderId: created.folderId,
      linkedModelUserId: created.linkedModelUserId,
      uploadedById: created.uploadedById,
      modelDownloadedAt: created.modelDownloadedAt ? created.modelDownloadedAt.toISOString() : null,
      scheduledHardDeleteAt: created.scheduledHardDeleteAt ? created.scheduledHardDeleteAt.toISOString() : null,
      hardDeleted: created.hardDeleted,
      createdAt: created.createdAt.toISOString(),
      publicKey: this.resolvePublicFilename(created),
      detailKey: this.resolveDetailFilename(created),
    };
  }

  async saveFile(
    file: Express.Multer.File,
    userId: string,
    folderId?: string | null,
    opts?: SaveFileOptions,
  ) {
    await this.purgeScheduledAssets();
    const root = this.root();
    this.ensureMediaRootWritable(root);
    const id = randomUUID();

    const multerPath = (file as Express.Multer.File & { path?: string }).path;
    const tmpDiskPath = multerPath && existsSync(multerPath) ? multerPath : undefined;
    const hasBuffer = Buffer.isBuffer(file.buffer) && file.buffer.length > 0;
    if (!tmpDiskPath && !hasBuffer) {
      throw new BadRequestException('Leeg uploadbestand.');
    }

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

    const sharpIn: string | Buffer = tmpDiskPath ?? (file.buffer as Buffer);

    let width: number | undefined;
    let height: number | undefined;
    let webpKey: string | undefined;
    let thumbKey: string | undefined;
    let storageKey: string;
    let mimeType = file.mimetype;
    let sizeBytes = file.size;

    try {
      if (webpOnly) {
        storageKey = `${id}.webp`;
        const full = join(root, storageKey);
        await sharp(sharpIn)
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
        const ws = createWriteStream(full);
        if (tmpDiskPath) {
          await pipeline(createReadStream(tmpDiskPath), ws);
        } else {
          await new Promise<void>((resolve, reject) => {
            ws.on('error', reject);
            ws.on('finish', () => resolve());
            ws.write(file.buffer as Buffer);
            ws.end();
          });
        }

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

      const linked =
        opts?.linkedModelUserId && /^[0-9a-f-]{36}$/i.test(opts.linkedModelUserId) ?
          opts.linkedModelUserId
        : undefined;

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
          linkedModelUserId: linked,
        },
      });
      this.invalidateDiskBasenameIndex();
      try {
        return this.uploadResponseDto(created);
      } catch (e) {
        console.error('[media] uploadResponseDto mislukt na DB-create — minimale JSON:', e);
        return {
          id: created.id,
          originalName: created.originalName,
          storageKey: created.storageKey,
          mimeType: created.mimeType,
          sizeBytes: created.sizeBytes,
          width: created.width,
          height: created.height,
          webpKey: created.webpKey,
          thumbKey: created.thumbKey,
          folderId: created.folderId,
          linkedModelUserId: created.linkedModelUserId,
          uploadedById: created.uploadedById,
          modelDownloadedAt: created.modelDownloadedAt?.toISOString() ?? null,
          scheduledHardDeleteAt: created.scheduledHardDeleteAt?.toISOString() ?? null,
          hardDeleted: created.hardDeleted,
          createdAt: created.createdAt.toISOString(),
          publicKey: created.storageKey,
          detailKey: created.storageKey,
        };
      }
    } catch (e: unknown) {
      if (e instanceof BadRequestException || e instanceof NotFoundException) throw e;
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('Dubbele sleutel bij opslaan; probeer opnieuw te uploaden.');
      }
      console.error('[media] saveFile mislukt:', e);
      const code = e && typeof e === 'object' && 'code' in e ? (e as NodeJS.ErrnoException).code : undefined;
      if (code === 'EACCES' || code === 'EPERM') {
        throw new BadRequestException(this.mediaRootWriteDeniedUserMessage(root));
      }
      if (code === 'ENOSPC') {
        throw new BadRequestException('Schijf vol; upload niet mogelijk.');
      }
      const msg = e instanceof Error ? e.message : String(e);
      throw new BadRequestException(
        `Upload mislukt: ${msg}. Controleer MEDIA_ROOT en of de Node-app die map mag schrijven.`,
      );
    } finally {
      if (tmpDiskPath) {
        try {
          unlinkSync(tmpDiskPath);
        } catch {
          /* */
        }
      }
    }
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
        folder: { slug: { in: ['models', 'tijdelijke-uploads'] } },
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
        folder: { slug: { in: ['models', 'tijdelijke-uploads'] } },
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
    const trash = await this.ensureTrashFolder();
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

  /** Verplaats bestanden naar een andere map (niet via prullenbak). */
  async moveAssetsToFolder(ids: string[], folderId: string) {
    await this.purgeScheduledAssets();
    const folder = await this.prisma.mediaFolder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('Bestemmingsmap niet gevonden.');
    const uniq = [...new Set(ids)].filter(Boolean);
    if (!uniq.length) return { moved: 0 };
    const res = await this.prisma.mediaAsset.updateMany({
      where: { id: { in: uniq }, hardDeleted: false },
      data: {
        folderId: folder.id,
        scheduledHardDeleteAt: null,
        modelDownloadedAt: null,
      },
    });
    return { moved: res.count };
  }

  async emptyTrash() {
    await this.purgeScheduledAssets();
    const trash = await this.ensureTrashFolder();
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

  async countPortfolioDeliveryForModel(modelUserId: string) {
    await this.purgeScheduledAssets();
    const folder = await this.prisma.mediaFolder.findUnique({ where: { slug: 'portfolio-fotograaf' } });
    if (!folder) return 0;
    return this.prisma.mediaAsset.count({
      where: {
        folderId: folder.id,
        linkedModelUserId: modelUserId,
        hardDeleted: false,
      },
    });
  }

  /**
   * ZIP met primaire bestanden (`storageKey`, maximale kwaliteit op schijf).
   * Na een geslaagde stream worden de assets definitief gewist (zoals testshoot-zip).
   */
  /** Bestandsnaam voor Content-Disposition (originele uploadnaam indien bekend). */
  async resolveDownloadFilename(publicKey: string): Promise<string> {
    const base = basename(publicKey);
    const row = await this.prisma.mediaAsset.findFirst({
      where: {
        hardDeleted: false,
        OR: [{ storageKey: base }, { webpKey: base }, { thumbKey: base }],
      },
      select: { originalName: true, storageKey: true },
    });
    const name = row?.originalName?.trim();
    if (name && !name.includes('..') && !name.includes('/')) return name;
    return base;
  }

  /** Publieke ZIP-download voor bezoekers (alleen als map-instelling aan staat). */
  async streamPublicFolderDownloadZip(slug: string, res: Response): Promise<void> {
    const normalized = slug.trim().toLowerCase();
    if (!normalized || !/^[a-z0-9-]+$/.test(normalized)) {
      throw new NotFoundException();
    }
    const folder = await this.prisma.mediaFolder.findUnique({ where: { slug: normalized } });
    if (!folder) throw new NotFoundException();
    if (folder.slug === 'verwijderde') throw new NotFoundException();
    const settings = parseMediaFolderSettings(folder.settings);
    if (!settings.publicZipDownload) throw new NotFoundException();
    await this.streamFolderDownloadZipForFolder(folder, res);
  }

  /**
   * ZIP van alle primaire bestanden in een mediamap (admin).
   * Geen verwijdering na download — anders dan portfolio-fotograaf.
   */
  async streamFolderDownloadZip(folderId: string, res: Response): Promise<void> {
    const folder = await this.prisma.mediaFolder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('Map niet gevonden.');
    if (folder.slug === 'verwijderde') {
      throw new BadRequestException('Prullenbak kan niet als ZIP worden gedownload.');
    }
    await this.streamFolderDownloadZipForFolder(folder, res);
  }

  private async streamFolderDownloadZipForFolder(
    folder: { id: string; slug: string },
    res: Response,
  ): Promise<void> {
    const rows = await this.prisma.mediaAsset.findMany({
      where: { folderId: folder.id, hardDeleted: false },
      orderBy: { createdAt: 'asc' },
    });
    const root = this.root();
    const onDisk = rows.filter((a) => existsSync(join(root, a.storageKey)));
    if (!onDisk.length) throw new NotFoundException('Geen bestanden op schijf om te downloaden.');

    const zipName = `${folder.slug.replace(/[^\w-]+/g, '-') || 'map'}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(zipName)}`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', () => {
      try {
        res.end();
      } catch {
        /* */
      }
    });

    const usedNames = new Set<string>();
    await new Promise<void>((resolve, reject) => {
      archive.on('error', reject);
      archive.on('end', () => resolve());
      archive.pipe(res);
      for (const a of onDisk) {
        const full = join(root, a.storageKey);
        let name = a.originalName?.trim() || basename(a.storageKey);
        if (!name || name.includes('..') || name.includes('/')) name = basename(a.storageKey);
        let finalName = name;
        let n = 2;
        while (usedNames.has(finalName)) {
          const ext = extname(name);
          const stem = ext ? name.slice(0, -ext.length) : name;
          finalName = `${stem}-${n}${ext}`;
          n += 1;
        }
        usedNames.add(finalName);
        archive.append(createReadStream(full), { name: finalName });
      }
      void archive.finalize();
    });
  }

  async streamPortfolioDeliveryZipAndConsume(modelUserId: string, res: Response): Promise<void> {
    await this.purgeScheduledAssets();
    const folder = await this.prisma.mediaFolder.findUnique({ where: { slug: 'portfolio-fotograaf' } });
    if (!folder) throw new NotFoundException();
    const rows = await this.prisma.mediaAsset.findMany({
      where: { folderId: folder.id, linkedModelUserId: modelUserId, hardDeleted: false },
      orderBy: { createdAt: 'asc' },
    });
    const root = this.root();
    const onDisk = rows.filter((a) => existsSync(join(root, a.storageKey)));
    if (!onDisk.length) throw new NotFoundException('Geen portfolio-bestanden om te downloaden.');

    const u = await this.prisma.user.findUnique({
      where: { id: modelUserId },
      select: { firstName: true, lastName: true, email: true },
    });
    const parts = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim();
    const base = parts || u?.email?.split('@')[0] || 'portfolio';
    const safe = base.replace(/[^\w\s-]/g, '').trim().slice(0, 50) || 'portfolio';
    const filename = `${safe}-portfolio.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', () => {
      try {
        res.end();
      } catch {
        /* */
      }
    });

    const ids: string[] = [];
    let filesInZip = 0;
    await new Promise<void>((resolve, reject) => {
      archive.on('error', reject);
      archive.on('end', () => resolve());
      archive.pipe(res);
      for (const a of onDisk) {
        const full = join(root, a.storageKey);
        archive.append(createReadStream(full), { name: a.originalName || basename(a.storageKey) });
        ids.push(a.id);
        filesInZip += 1;
      }
      void archive.finalize();
    });

    if (filesInZip > 0) {
      for (const id of ids) {
        try {
          await this.removeAsset(id, true);
        } catch {
          /* */
        }
      }
      void this.modelHistory.log(modelUserId, 'portfolio_shoot_zip_downloaded', {
        fileCount: filesInZip,
      });
    }
  }

  async updateFolderSettings(
    folderId: string,
    patch: {
      deleteDaysAfterModelDownload?: number;
      storeUploadsAsWebpOnly?: boolean;
      publicZipDownload?: boolean;
    },
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

  /**
   * Registreert mediabestanden op schijf onder MEDIA_ROOT die nog geen MediaAsset hebben (o.a. na FTP of verkeerde MEDIA_ROOT).
   * Bestanden die al als storageKey/webpKey/thumbKey bestaan, worden overgeslagen.
   */
  /**
   * Upload een .zip (tot ~6 GB) als één mediabestand in de gekozen map (niet uitpakken).
   * Modellen downloaden het .zip-bestand via het modellenportaal.
   */
  async importZipUpload(file: Express.Multer.File, userId: string, folderId: string) {
    const zipPath = (file as Express.Multer.File & { path?: string }).path;
    if (!zipPath || !existsSync(zipPath)) {
      throw new BadRequestException('ZIP-upload mislukt (tijdelijk bestand ontbreekt).');
    }
    if (!/\.zip$/i.test(file.originalname || '')) {
      throw new BadRequestException('Alleen .zip-bestanden.');
    }

    const folder = await this.prisma.mediaFolder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('Map niet gevonden.');
    if (folder.slug === 'verwijderde') {
      throw new BadRequestException('ZIP kan niet naar de prullenbak.');
    }

    const root = this.root();
    this.ensureMediaRootWritable(root);

    const id = randomUUID();
    const storageKey = `${id}.zip`;
    const dest = join(root, storageKey);
    try {
      renameSync(zipPath, dest);
    } catch {
      throw new BadRequestException('ZIP kon niet naar MEDIA_ROOT worden verplaatst.');
    }

    const originalName = basename(file.originalname || 'archief.zip');
    const sizeBytes = statSync(dest).size;

    const created = await this.prisma.mediaAsset.create({
      data: {
        originalName,
        storageKey,
        mimeType: 'application/zip',
        sizeBytes,
        uploadedById: userId,
        folderId: folder.id,
      },
    });
    this.invalidateDiskBasenameIndex();

    return {
      ok: true,
      folderSlug: folder.slug,
      mediaRoot: root,
      zipName: originalName,
      assetId: created.id,
      storageKey: created.storageKey,
      sizeBytes,
    };
  }

  /** Status voor modeshow-downloads in het modellenportaal. */
  async getModeshowDownloadsMeta() {
    const availableFrom = modeshowDownloadsAvailableFrom();
    const now = new Date();
    const folderSlug = modeshowPhotosFolderSlug();
    const folder = await this.prisma.mediaFolder.findUnique({ where: { slug: folderSlug } });
    let photosZip: { id: string; originalName: string; sizeBytes: number } | null = null;
    let film: { id: string; originalName: string; sizeBytes: number; mimeType: string } | null = null;

    if (folder) {
      const zipRow = await this.prisma.mediaAsset.findFirst({
        where: {
          folderId: folder.id,
          hardDeleted: false,
          OR: [
            { mimeType: 'application/zip' },
            { storageKey: { endsWith: '.zip' } },
            { originalName: { endsWith: '.zip' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, originalName: true, sizeBytes: true, storageKey: true },
      });
      if (zipRow && existsSync(join(this.root(), zipRow.storageKey))) {
        photosZip = {
          id: zipRow.id,
          originalName: zipRow.originalName,
          sizeBytes: zipRow.sizeBytes,
        };
      }

      const filmName = modeshowFilmOriginalName();
      const filmRow = await this.prisma.mediaAsset.findFirst({
        where: {
          folderId: folder.id,
          hardDeleted: false,
          ...(filmName ?
            { originalName: filmName }
          : {
              OR: [
                { mimeType: { startsWith: 'video/' } },
                { storageKey: { endsWith: '.mp4' } },
                { storageKey: { endsWith: '.mov' } },
                { storageKey: { endsWith: '.webm' } },
              ],
            }),
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, originalName: true, sizeBytes: true, storageKey: true, mimeType: true },
      });
      if (filmRow && existsSync(join(this.root(), filmRow.storageKey))) {
        film = {
          id: filmRow.id,
          originalName: filmRow.originalName,
          sizeBytes: filmRow.sizeBytes,
          mimeType: filmRow.mimeType,
        };
      }
    }

    return {
      availableFrom: availableFrom.toISOString(),
      availableNow: now >= availableFrom,
      folderSlug,
      photosZip,
      film,
    };
  }

  private modeshowAvailabilityGuard() {
    try {
      assertModeshowDownloadsAvailable();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.startsWith('MODESHOW_NOT_YET:')) {
        const from = msg.slice('MODESHOW_NOT_YET:'.length);
        throw new BadRequestException(
          `Downloads zijn beschikbaar vanaf ${from}.`,
        );
      }
      throw e;
    }
  }

  async streamModeshowPhotosZip(modelUserId: string, res: Response): Promise<void> {
    this.modeshowAvailabilityGuard();
    const meta = await this.getModeshowDownloadsMeta();
    if (!meta.photosZip) throw new NotFoundException('Geen fot ZIP gevonden in de mediatheek.');
    await this.streamMediaAssetDownload(meta.photosZip.id, res);
    void this.modelHistory.log(modelUserId, 'modeshow_photos_zip_downloaded', {
      assetId: meta.photosZip.id,
      name: meta.photosZip.originalName,
    });
  }

  async streamModeshowFilm(modelUserId: string, res: Response): Promise<void> {
    this.modeshowAvailabilityGuard();
    const meta = await this.getModeshowDownloadsMeta();
    if (!meta.film) throw new NotFoundException('Geen film gevonden in de mediatheek.');
    await this.streamMediaAssetDownload(meta.film.id, res);
    void this.modelHistory.log(modelUserId, 'modeshow_film_downloaded', {
      assetId: meta.film.id,
      name: meta.film.originalName,
    });
  }

  /** Download één mediabestand (storageKey) voor ingelogde modellen. */
  async streamMediaAssetDownload(assetId: string, res: Response): Promise<void> {
    const row = await this.prisma.mediaAsset.findFirst({
      where: { id: assetId, hardDeleted: false },
    });
    if (!row) throw new NotFoundException('Bestand niet gevonden.');
    const full = join(this.root(), row.storageKey);
    if (!existsSync(full)) throw new NotFoundException('Bestand ontbreekt op schijf.');
    const downloadName = await this.resolveDownloadFilename(row.storageKey);
    if (row.mimeType) res.setHeader('Content-Type', row.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
    );
    return new Promise<void>((resolve, reject) => {
      const stream = createReadStream(full);
      stream.on('error', reject);
      stream.on('end', () => resolve());
      stream.pipe(res);
    });
  }

  async registerDiskOrphanAssets(
    uploadedById: string,
    opts: { folderSlug: string; limit: number; dryRun: boolean },
  ) {
    await this.purgeScheduledAssets();
    const slug = opts.folderSlug.trim() || 'models';
    const maxReg = Math.min(500, Math.max(1, Math.floor(opts.limit)));
    const dryRun = opts.dryRun;

    const folder = await this.prisma.mediaFolder.findUnique({ where: { slug } });
    if (!folder) {
      throw new BadRequestException(`Onbekende map: ${slug}`);
    }
    if (slug === 'verwijderde') {
      throw new BadRequestException('Kan geen weesbestanden in de prullenbak registreren.');
    }

    const root = this.root();
    if (!existsSync(root)) {
      return {
        registered: 0,
        previewWouldRegister: 0,
        skipped: 0,
        dryRun,
        folderSlug: slug,
        mediaRoot: root,
        errors: [`MEDIA_ROOT bestaat niet: ${root}`],
        scannedFiles: 0,
      };
    }

    const existingKeys = new Set<string>();
    const rows = await this.prisma.mediaAsset.findMany({
      where: { hardDeleted: false },
      select: { storageKey: true, webpKey: true, thumbKey: true },
    });
    for (const r of rows) {
      existingKeys.add(r.storageKey);
      if (r.webpKey) existingKeys.add(r.webpKey);
      if (r.thumbKey) existingKeys.add(r.thumbKey);
    }

    const files = this.collectRegisterableDiskFiles(root, 12000);
    const baseSet = new Set(files.map((f) => f.base));

    const errors: string[] = [];
    let registered = 0;
    let previewWouldRegister = 0;
    let skipped = 0;

    const mimeFor = (ext: string): string => {
      const e = ext.toLowerCase();
      if (e === '.jpg' || e === '.jpeg') return 'image/jpeg';
      if (e === '.png') return 'image/png';
      if (e === '.webp') return 'image/webp';
      if (e === '.gif') return 'image/gif';
      if (e === '.mp4') return 'video/mp4';
      if (e === '.webm') return 'video/webm';
      if (e === '.mov') return 'video/quicktime';
      if (e === '.m4v') return 'video/x-m4v';
      return 'application/octet-stream';
    };

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    for (const { rel, base } of files) {
      const totalDone = dryRun ? previewWouldRegister : registered;
      if (totalDone >= maxReg) break;

      if (existingKeys.has(base)) {
        skipped++;
        continue;
      }

      if (/_thumb\.webp$/i.test(base)) {
        skipped++;
        continue;
      }

      const ext = extname(base);
      const idPart = ext ? base.slice(0, -ext.length) : base;
      const lowerExt = ext.toLowerCase();
      if (uuidRe.test(idPart) && lowerExt === '.webp') {
        const hasRaster =
          baseSet.has(`${idPart}.jpg`) ||
          baseSet.has(`${idPart}.jpeg`) ||
          baseSet.has(`${idPart}.png`) ||
          baseSet.has(`${idPart}.gif`);
        if (hasRaster) {
          skipped++;
          continue;
        }
      }

      const abs = join(root, rel);
      let st: ReturnType<typeof statSync>;
      try {
        st = statSync(abs);
      } catch (e) {
        errors.push(`${base}: ${e instanceof Error ? e.message : String(e)}`);
        if (errors.length > 25) break;
        continue;
      }
      if (!st.isFile()) {
        skipped++;
        continue;
      }

      let width: number | null = null;
      let height: number | null = null;
      const mimeType = mimeFor(ext || '');
      if (mimeType.startsWith('image/')) {
        try {
          const meta = await sharp(abs).rotate().metadata();
          width = meta.width ?? null;
          height = meta.height ?? null;
        } catch {
          /* */
        }
      }

      let webpKey: string | null = null;
      let thumbKey: string | null = null;
      if (uuidRe.test(idPart) && ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(lowerExt)) {
        const dirRel = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
        const dirAbs = dirRel ? join(root, dirRel) : root;
        const w = `${idPart}.webp`;
        const th = `${idPart}_thumb.webp`;
        if (base !== w && existsSync(join(dirAbs, w))) webpKey = w;
        if (base !== th && existsSync(join(dirAbs, th))) thumbKey = th;
      }

      if (dryRun) {
        previewWouldRegister++;
        continue;
      }

      try {
        await this.prisma.mediaAsset.create({
          data: {
            originalName: base,
            storageKey: base,
            mimeType,
            sizeBytes: st.size,
            width,
            height,
            webpKey,
            thumbKey,
            uploadedById,
            folderId: folder.id,
          },
        });
        existingKeys.add(base);
        if (webpKey) existingKeys.add(webpKey);
        if (thumbKey) existingKeys.add(thumbKey);
        registered++;
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          skipped++;
          existingKeys.add(base);
        } else {
          errors.push(`${base}: ${e instanceof Error ? e.message : String(e)}`);
          if (errors.length > 25) break;
        }
      }
    }

    this.invalidateDiskBasenameIndex();
    return {
      registered,
      previewWouldRegister: dryRun ? previewWouldRegister : 0,
      skipped,
      dryRun,
      folderSlug: slug,
      mediaRoot: root,
      scannedFiles: files.length,
      errors,
    };
  }

  private collectRegisterableDiskFiles(root: string, cap: number): { rel: string; base: string }[] {
    const out: { rel: string; base: string }[] = [];
    const skipDirs = new Set([
      'agenda',
      'photographer-tmp',
      '.zip-upload-tmp',
      'node_modules',
      '.git',
      '__MACOSX',
      'verwijderde',
    ]);
    const extOk = /\.(jpe?g|webp|png|gif|mp4|webm|mov|m4v)$/i;

    const walk = (dir: string, relFromRoot: string, depth: number) => {
      if (out.length >= cap || depth > 14) return;
      let ents: Dirent[];
      try {
        ents = readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of ents) {
        if (out.length >= cap) return;
        if (e.name.startsWith('.')) continue;
        const subRel = relFromRoot ? `${relFromRoot}/${e.name}` : e.name;
        const full = join(dir, e.name);
        if (e.isDirectory()) {
          if (skipDirs.has(e.name)) continue;
          walk(full, subRel, depth + 1);
        } else if (e.isFile() && extOk.test(e.name)) {
          out.push({ rel: subRel, base: e.name });
        }
      }
    };
    walk(root, '', 0);
    return out;
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
        try {
          const rel = this.lookupDiskRelativePath(basename(k));
          if (rel) unlinkSync(join(root, rel));
        } catch {
          /* */
        }
      }
    }
    await this.prisma.mediaAsset.delete({ where: { id } });
    this.invalidateDiskBasenameIndex();
    return { ok: true, hard: true };
  }

  private monorepoRoot(): string {
    let cur = process.cwd();
    for (let i = 0; i < 10; i++) {
      if (existsSync(join(cur, 'scripts', 'combell-sync-media-uploads.cjs'))) return cur;
      const parent = resolve(join(cur, '..'));
      if (parent === cur) break;
      cur = parent;
    }
    return process.cwd();
  }

  /** Diagnose: schijf vs database (Combell MEDIA_ROOT). */
  async getStorageDiagnostics() {
    const root = this.root();
    const diskFiles = existsSync(root) ? this.collectRegisterableDiskFiles(root, 50000).length : 0;
    const diskImages = existsSync(root) ? countMediaFilesShallow(root, 2) : 0;

    const totalAssets = await this.prisma.mediaAsset.count({ where: { hardDeleted: false } });
    const modelsFolder = await this.prisma.mediaFolder.findUnique({ where: { slug: 'models' } });
    const modelsAssets = modelsFolder
      ? await this.prisma.mediaAsset.count({
          where: { folderId: modelsFolder.id, hardDeleted: false },
        })
      : 0;

    const sampleRows = await this.prisma.mediaAsset.findMany({
      where: { hardDeleted: false },
      take: 40,
      orderBy: { createdAt: 'desc' },
      select: { id: true, storageKey: true, webpKey: true, thumbKey: true, originalName: true },
    });

    let missingPrimary = 0;
    const missingSamples: { id: string; storageKey: string }[] = [];
    for (const a of sampleRows) {
      const key = this.resolvePublicFilename(a);
      const onDisk =
        existsSync(join(root, key)) ||
        Boolean(this.lookupDiskRelativePath(basename(key)));
      if (!onDisk) {
        missingPrimary++;
        if (missingSamples.length < 8) {
          missingSamples.push({ id: a.id, storageKey: key });
        }
      }
    }

    const bundleDir = join(this.monorepoRoot(), 'apps', 'api', '.deploy-media-bundle', 'uploads');
    const sharedDir = join(this.monorepoRoot(), 'shared', 'uploads');

    return {
      mediaRoot: root,
      mediaRootExists: existsSync(root),
      diskRegisterableFiles: diskFiles,
      diskImageFiles: diskImages,
      env: {
        MEDIA_ROOT: process.env.MEDIA_ROOT?.trim() || null,
        MEDIA_SYNC_SOURCE: process.env.MEDIA_SYNC_SOURCE?.trim() || null,
        HOME: process.env.HOME?.trim() || null,
        NODE_ENV: process.env.NODE_ENV || null,
      },
      bundlePath: bundleDir,
      bundleImageFiles: existsSync(bundleDir) ? countMediaFilesShallow(bundleDir, 2) : 0,
      sharedPath: sharedDir,
      sharedImageFiles: existsSync(sharedDir) ? countMediaFilesShallow(sharedDir, 2) : 0,
      database: { totalAssets, modelsAssets },
      sampleCheck: {
        scanned: sampleRows.length,
        missingPrimaryOnDisk: missingPrimary,
        missingSamples,
      },
    };
  }

  /**
   * Kopieert deploy-bundle / shared/uploads naar MEDIA_ROOT (zelfde logica als combell-dual-proxy bij start).
   */
  applyDeployMediaBundle(force = false) {
    const repoRoot = this.monorepoRoot();
    const script = join(repoRoot, 'scripts', 'combell-sync-media-uploads.cjs');
    if (!existsSync(script)) {
      throw new BadRequestException(`Sync-script niet gevonden: ${script}`);
    }
    const env = { ...process.env };
    if (force) env.COMBELL_FORCE_MEDIA_BUNDLE = '1';
    const beforeRoot = this.root();
    const beforeCount = existsSync(beforeRoot) ? countMediaFilesShallow(beforeRoot, 2) : 0;

    const r = spawnSync(process.execPath, [script], {
      cwd: repoRoot,
      env,
      encoding: 'utf8',
      timeout: 600_000,
    });

    const stderr = (r.stderr || '').trim();
    const stdout = (r.stdout || '').trim();
    const log = [stderr, stdout].filter(Boolean).join('\n').slice(-4000);

    if (r.status !== 0) {
      throw new BadRequestException(
        `Media-bundle sync mislukt (exit ${r.status ?? '?'}). ${log || 'geen uitvoer'}`,
      );
    }

    this.invalidateDiskBasenameIndex();
    const afterRoot = resolveMediaRoot();
    const afterCount = existsSync(afterRoot) ? countMediaFilesShallow(afterRoot, 2) : 0;

    return {
      ok: true,
      mediaRoot: afterRoot,
      filesBefore: beforeCount,
      filesAfter: afterCount,
      logTail: log,
    };
  }
}
