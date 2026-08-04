import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { resolveMediaRoot } from '../config/resolve-media-root';
import { DEFAULT_PARTNER_LOGOS } from './default-partners';

@Injectable()
export class PartnersService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const n = await this.prisma.partnerLogo.count();
      if (n === 0) {
        for (const p of DEFAULT_PARTNER_LOGOS) {
          await this.prisma.partnerLogo.create({
            data: {
              name: p.name,
              websiteUrl: p.websiteUrl,
              imagePath: p.imagePath,
              sortOrder: p.sortOrder,
              visible: true,
            },
          });
        }
        console.log(`[partners] ${DEFAULT_PARTNER_LOGOS.length} standaardlogo's geseed`);
      }
    } catch (e) {
      console.warn(
        '[partners] Seed overgeslagen (tabel nog niet gemigreerd?):',
        e instanceof Error ? e.message : e,
      );
    }
  }

  listPublic() {
    return this.prisma.partnerLogo.findMany({
      where: { visible: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        websiteUrl: true,
        imagePath: true,
        sortOrder: true,
      },
    });
  }

  listAdmin() {
    return this.prisma.partnerLogo.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(data: {
    name: string;
    websiteUrl?: string | null;
    imagePath: string;
    sortOrder?: number;
    visible?: boolean;
  }) {
    return this.prisma.partnerLogo.create({
      data: {
        name: data.name.trim(),
        websiteUrl: normalizeUrl(data.websiteUrl),
        imagePath: data.imagePath.trim(),
        sortOrder: data.sortOrder ?? 0,
        visible: data.visible ?? true,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      websiteUrl: string | null;
      imagePath: string;
      sortOrder: number;
      visible: boolean;
    }>,
  ) {
    const row = await this.prisma.partnerLogo.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    return this.prisma.partnerLogo.update({
      where: { id },
      data: {
        ...(data.name != null ? { name: data.name.trim() } : {}),
        ...(data.websiteUrl !== undefined ? { websiteUrl: normalizeUrl(data.websiteUrl) } : {}),
        ...(data.imagePath != null ? { imagePath: data.imagePath.trim() } : {}),
        ...(data.sortOrder != null ? { sortOrder: data.sortOrder } : {}),
        ...(data.visible != null ? { visible: data.visible } : {}),
      },
    });
  }

  async remove(id: string) {
    const row = await this.prisma.partnerLogo.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    await this.prisma.partnerLogo.delete({ where: { id } });
    return { ok: true };
  }

  /** Slaat upload op onder media/partners en geeft `/uploads/partners/…` terug. */
  saveUploadedLogo(file: Express.Multer.File): string {
    if (!file?.buffer?.length) throw new BadRequestException('Geen bestand ontvangen');
    const mime = (file.mimetype || '').toLowerCase();
    if (!mime.startsWith('image/')) {
      throw new BadRequestException('Alleen afbeeldingen (PNG/JPG/WEBP/SVG)');
    }
    const ext =
      mime.includes('png')
        ? 'png'
        : mime.includes('webp')
          ? 'webp'
          : mime.includes('svg')
            ? 'svg'
            : mime.includes('jpeg') || mime.includes('jpg')
              ? 'jpg'
              : 'png';
    const dir = join(resolveMediaRoot(), 'partners');
    mkdirSync(dir, { recursive: true });
    const name = `${randomUUID()}.${ext}`;
    writeFileSync(join(dir, name), file.buffer);
    return `/uploads/partners/${name}`;
  }
}

function normalizeUrl(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}
