import { Injectable, NotFoundException } from '@nestjs/common';
import { createWriteStream, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import sharp from 'sharp';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  root() {
    return process.env.MEDIA_ROOT ?? join(process.cwd(), 'uploads');
  }

  async ensureDefaultFolders() {
    const defs: [string, string][] = [
      ['casting', 'Casting'],
      ['site', 'Site'],
      ['uploads', 'Uploads'],
      ['opdrachten', 'Opdrachten'],
      ['reviews', 'Reviews'],
      ['models', 'Modellen'],
    ];
    for (const [slug, label] of defs) {
      await this.prisma.mediaFolder.upsert({
        where: { slug },
        update: { label },
        create: { slug, label },
      });
    }
    return this.prisma.mediaFolder.findMany({ orderBy: { slug: 'asc' } });
  }

  library() {
    return this.prisma.mediaFolder.findMany({
      orderBy: { slug: 'asc' },
      include: {
        assets: {
          where: { hardDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 80,
        },
      },
    });
  }

  async saveFile(file: Express.Multer.File, userId: string, folderId?: string | null) {
    const root = this.root();
    if (!existsSync(root)) mkdirSync(root, { recursive: true });
    const id = randomUUID();
    const ext = file.originalname.split('.').pop() ?? 'bin';
    const storageKey = `${id}.${ext}`;
    const full = join(root, storageKey);
    await new Promise<void>((resolve, reject) => {
      const ws = createWriteStream(full);
      ws.on('error', reject);
      ws.on('finish', () => resolve());
      ws.write(file.buffer);
      ws.end();
    });

    let width: number | undefined;
    let height: number | undefined;
    let webpKey: string | undefined;
    let thumbKey: string | undefined;

    if (file.mimetype.startsWith('image/')) {
      const meta = await sharp(full).metadata();
      width = meta.width;
      height = meta.height;
      webpKey = `${id}.webp`;
      await sharp(full).webp({ quality: 82 }).toFile(join(root, webpKey));
      thumbKey = `${id}_thumb.webp`;
      await sharp(full)
        .resize(320, 320, { fit: 'inside' })
        .webp({ quality: 80 })
        .toFile(join(root, thumbKey));
    }

    return this.prisma.mediaAsset.create({
      data: {
        originalName: file.originalname,
        storageKey,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        width,
        height,
        webpKey,
        thumbKey,
        uploadedById: userId,
        folderId: folderId && folderId.length > 0 ? folderId : undefined,
      },
    });
  }

  list() {
    return this.prisma.mediaAsset.findMany({
      where: { hardDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  listForUploader(userId: string) {
    return this.prisma.mediaAsset.findMany({
      where: { uploadedById: userId, hardDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
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
    return this.saveFile(file, userId, folder?.id ?? undefined);
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
