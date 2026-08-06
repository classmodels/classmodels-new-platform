import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join, extname } from 'path';
import archiver from 'archiver';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { ModelPortalHistoryService } from './model-portal-history.service';
import { sendHtmlMail } from '../mail/send-html-mail';
import { resolveMediaRoot } from '../config/resolve-media-root';

@Injectable()
export class PortfolioDeliveryService {
  constructor(
    private prisma: PrismaService,
    private media: MediaService,
    private history: ModelPortalHistoryService,
  ) {}

  private async portfolioFolderId() {
    await this.media.ensureDefaultFolders();
    const folder = await this.prisma.mediaFolder.findUnique({ where: { slug: 'portfolio-fotograaf' } });
    if (!folder) throw new NotFoundException('Map portfolio-fotograaf ontbreekt.');
    return folder.id;
  }

  /** Ack-tabel kan kort ontbreken als migrate op Combell nog niet liep. */
  private async findAck(modelUserId: string) {
    try {
      return await this.prisma.portfolioDeliveryAck.findUnique({
        where: { modelUserId },
        select: { downloadedAt: true, fileCount: true, shootDate: true },
      });
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'P2021' || /PortfolioDeliveryAck/i.test(String((e as Error)?.message ?? ''))) {
        return null;
      }
      throw e;
    }
  }

  async statusForModel(modelUserId: string) {
    await this.media.purgeScheduledAssets();
    const folderId = await this.portfolioFolderId();
    const count = await this.prisma.mediaAsset.count({
      where: { folderId, linkedModelUserId: modelUserId, hardDeleted: false },
    });
    const ack = await this.findAck(modelUserId);
    return {
      available: count > 0,
      fileCount: count,
      downloadedAt: ack?.downloadedAt?.toISOString() ?? null,
      downloadedFileCount: ack?.fileCount ?? 0,
      shootDate: ack?.shootDate ?? null,
    };
  }

  /** Alle portfolio-boekingen + leveringsstatus, optioneel gefilterd op dag (YYYY-MM-DD). */
  async listAdmin(day?: string) {
    const cal = await this.prisma.agendaCalendar.findUnique({ where: { slug: 'portfolio' } });
    if (!cal) return { days: [] as string[], rows: [] as unknown[] };

    const bookings = await this.prisma.agendaBooking.findMany({
      where: {
        calendarId: cal.id,
        status: { notIn: ['cancelled', 'cancelled_cm', 'geannuleerd'] },
      },
      orderBy: { startAt: 'desc' },
      take: 500,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
    });

    const daysSet = new Set<string>();
    const folderId = await this.portfolioFolderId().catch(() => null);

    const mapped = await Promise.all(
      bookings.map(async (b) => {
        const shootDate = b.startAt.toISOString().slice(0, 10);
        daysSet.add(shootDate);
        if (day && shootDate !== day) return null;
        const modelUserId = b.userId;
        const name =
          [b.user?.firstName, b.user?.lastName].filter(Boolean).join(' ').trim() ||
          [b.firstname, b.lastname].filter(Boolean).join(' ').trim() ||
          b.name?.trim() ||
          b.email ||
          '—';
        let fileCount = 0;
        let ack: { downloadedAt: Date; fileCount: number } | null = null;
        if (modelUserId) {
          if (folderId) {
            fileCount = await this.prisma.mediaAsset.count({
              where: { folderId, linkedModelUserId: modelUserId, hardDeleted: false },
            });
          }
          ack = await this.findAck(modelUserId);
        }
        return {
          bookingId: b.id,
          modelUserId,
          name,
          email: b.user?.email || b.email || null,
          phone: b.user?.phone || b.phone || null,
          shootDate,
          startAt: b.startAt.toISOString(),
          status: b.status,
          fileCount,
          available: fileCount > 0,
          downloadedAt: ack?.downloadedAt?.toISOString() ?? null,
          downloadedFileCount: ack?.fileCount ?? 0,
        };
      }),
    );

    const rows = mapped.filter(Boolean);
    const days = [...daysSet].sort().reverse();
    return { days, rows };
  }

  async clearAck(modelUserId: string) {
    try {
      await this.prisma.portfolioDeliveryAck.deleteMany({ where: { modelUserId } });
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code !== 'P2021' && !/PortfolioDeliveryAck/i.test(String((e as Error)?.message ?? ''))) throw e;
    }
    return { ok: true };
  }

  async hardDeleteFiles(modelUserId: string) {
    const folderId = await this.portfolioFolderId();
    const rows = await this.prisma.mediaAsset.findMany({
      where: { folderId, linkedModelUserId: modelUserId, hardDeleted: false },
      select: { id: true },
    });
    for (const r of rows) {
      try {
        await this.media.removeAsset(r.id, true);
      } catch {
        /* */
      }
    }
    await this.prisma.portfolioDeliveryAck.deleteMany({ where: { modelUserId } });
    return { ok: true, deleted: rows.length };
  }

  async streamZip(
    modelUserId: string,
    res: Response,
    opts: { consume: boolean; shootDate?: string | null },
  ) {
    await this.media.purgeScheduledAssets();
    const folderId = await this.portfolioFolderId();
    const rows = await this.prisma.mediaAsset.findMany({
      where: { folderId, linkedModelUserId: modelUserId, hardDeleted: false },
      orderBy: { createdAt: 'asc' },
    });
    const root = resolveMediaRoot();
    const onDisk = rows.filter((a) => existsSync(join(root, a.storageKey)));
    if (!onDisk.length) throw new NotFoundException('Geen portfolio-bestanden om te downloaden.');

    const u = await this.prisma.user.findUnique({
      where: { id: modelUserId },
      select: { firstName: true, lastName: true, email: true },
    });
    const parts = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim();
    const base = parts || u?.email?.split('@')[0] || 'model';
    const safe = base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'model';
    const filename = `${safe}-class-models.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

    const archive = archiver('zip', { zlib: { level: 5 } });
    const ids: string[] = [];
    let filesInZip = 0;
    const usedNames = new Set<string>();

    await new Promise<void>((resolve, reject) => {
      archive.on('error', reject);
      archive.on('end', () => resolve());
      archive.pipe(res);
      for (const a of onDisk) {
        const full = join(root, a.storageKey);
        const ext = (extname(a.originalName || a.storageKey) || '.bin').toLowerCase();
        let name =
          a.mimeType.includes('zip') || ext === '.zip'
            ? `${safe}-class-models.zip`
            : `${safe}-class-models-${filesInZip + 1}${ext}`;
        if (usedNames.has(name)) {
          const stem = name.replace(/\.[^.]+$/, '');
          let n = 2;
          while (usedNames.has(`${stem}-${n}${ext}`)) n += 1;
          name = `${stem}-${n}${ext}`;
        }
        usedNames.add(name);
        archive.append(createReadStream(full), { name });
        ids.push(a.id);
        filesInZip += 1;
      }
      void archive.finalize();
    });

    if (opts.consume && filesInZip > 0) {
      const now = new Date();
      await this.prisma.portfolioDeliveryAck.upsert({
        where: { modelUserId },
        create: {
          modelUserId,
          downloadedAt: now,
          fileCount: filesInZip,
          shootDate: opts.shootDate ?? null,
        },
        update: {
          downloadedAt: now,
          fileCount: filesInZip,
          shootDate: opts.shootDate ?? undefined,
        },
      });
      for (const id of ids) {
        try {
          await this.media.removeAsset(id, true);
        } catch {
          /* */
        }
      }
      void this.history.log(modelUserId, 'portfolio_shoot_zip_downloaded', {
        fileCount: filesInZip,
        shootDate: opts.shootDate ?? null,
      });
    }
  }

  async bulkMail(opts: {
    modelUserIds: string[];
    subject: string;
    bodyHtml: string;
  }) {
    const subject = opts.subject.trim();
    const body = opts.bodyHtml.trim();
    if (!subject || !body) throw new BadRequestException('Onderwerp en bericht zijn verplicht.');
    const ids = [...new Set(opts.modelUserIds.filter(Boolean))];
    if (!ids.length) throw new BadRequestException('Selecteer minstens één model.');

    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    let sent = 0;
    const failed: string[] = [];
    for (const u of users) {
      const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email;
      const html = body
        .replace(/\{\{naam\}\}/gi, name)
        .replace(/\{\{email\}\}/gi, u.email);
      const ok = await sendHtmlMail(this.prisma, u.email, subject, html);
      if (ok) sent += 1;
      else failed.push(u.email);
    }
    return { sent, failed, total: users.length };
  }
}
