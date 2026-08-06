import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { extname } from 'path';
import { pipeline } from 'stream/promises';
import type { Readable } from 'stream';
import archiver from 'archiver';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { ModelPortalHistoryService } from './model-portal-history.service';
import { sendHtmlMail } from '../mail/send-html-mail';

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

  private modelZipSafeName(firstName?: string | null, lastName?: string | null, email?: string | null) {
    const parts = [firstName, lastName].filter(Boolean).join(' ').trim();
    const base = parts || email?.split('@')[0] || 'model';
    return (
      base
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase() || 'model'
    );
  }

  private isZipAsset(a: { mimeType: string; originalName: string | null; storageKey: string }) {
    return (
      a.mimeType.includes('zip') ||
      /\.zip$/i.test(a.originalName || '') ||
      /\.zip$/i.test(a.storageKey || '')
    );
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
    await this.clearAck(modelUserId);
    return { ok: true, deleted: rows.length };
  }

  private async markConsumed(
    modelUserId: string,
    ids: string[],
    fileCount: number,
    shootDate?: string | null,
  ) {
    const now = new Date();
    try {
      await this.prisma.portfolioDeliveryAck.upsert({
        where: { modelUserId },
        create: {
          modelUserId,
          downloadedAt: now,
          fileCount,
          shootDate: shootDate ?? null,
        },
        update: {
          downloadedAt: now,
          fileCount,
          shootDate: shootDate ?? undefined,
        },
      });
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code !== 'P2021' && !/PortfolioDeliveryAck/i.test(String((e as Error)?.message ?? ''))) throw e;
    }
    for (const id of ids) {
      try {
        await this.media.removeAsset(id, true);
      } catch {
        /* */
      }
    }
    void this.history.log(modelUserId, 'portfolio_shoot_zip_downloaded', {
      fileCount,
      shootDate: shootDate ?? null,
    });
  }

  async streamZip(
    modelUserId: string,
    res: Response,
    opts: { consume: boolean; shootDate?: string | null },
  ) {
    const folderId = await this.portfolioFolderId();
    const rows = await this.prisma.mediaAsset.findMany({
      where: { folderId, linkedModelUserId: modelUserId, hardDeleted: false },
      orderBy: { createdAt: 'asc' },
    });

    const available: typeof rows = [];
    for (const a of rows) {
      if (await this.media.assetKeyExists(a.storageKey)) available.push(a);
    }
    if (!available.length) {
      throw new NotFoundException('Geen portfolio-bestanden om te downloaden.');
    }

    const u = await this.prisma.user.findUnique({
      where: { id: modelUserId },
      select: { firstName: true, lastName: true, email: true },
    });
    const safe = this.modelZipSafeName(u?.firstName, u?.lastName, u?.email);
    const filename = `${safe}-class-models.zip`;
    const ids = available.map((a) => a.id);

    // Snelle weg: fotograaf leverde al één ZIP → rechtstreeks streamen (geen her-zippen).
    if (available.length === 1 && this.isZipAsset(available[0])) {
      const a = available[0];
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      if (a.sizeBytes > 0) res.setHeader('Content-Length', String(a.sizeBytes));
      res.setHeader('Cache-Control', 'no-store');
      const stream = await this.media.openAssetReadStream(a.storageKey);
      await pipeline(stream as Readable, res);
      if (opts.consume) {
        await this.markConsumed(modelUserId, ids, 1, opts.shootDate);
      }
      return;
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Cache-Control', 'no-store');

    // store: true = geen hercompressie (foto’s/ZIP zijn al gecomprimeerd) → sneller, eerste bytes meteen.
    const archive = archiver('zip', { zlib: { level: 0 }, store: true });
    const usedNames = new Set<string>();
    let filesInZip = 0;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const fail = (err: unknown) => {
        if (settled) return;
        settled = true;
        reject(err instanceof Error ? err : new Error(String(err)));
      };
      const ok = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      archive.on('error', fail);
      archive.on('end', ok);
      res.on('close', () => {
        if (!res.writableEnded) fail(new Error('Download afgebroken.'));
      });
      archive.pipe(res);

      void (async () => {
        try {
          for (const a of available) {
            const ext = (extname(a.originalName || a.storageKey) || '.bin').toLowerCase();
            let name =
              this.isZipAsset(a) ? `${safe}-class-models.zip` : `${safe}-class-models-${filesInZip + 1}${ext}`;
            if (usedNames.has(name)) {
              const stem = name.replace(/\.[^.]+$/, '');
              let n = 2;
              while (usedNames.has(`${stem}-${n}${ext}`)) n += 1;
              name = `${stem}-${n}${ext}`;
            }
            usedNames.add(name);
            const stream = await this.media.openAssetReadStream(a.storageKey);
            archive.append(stream as Readable, { name, store: true });
            filesInZip += 1;
          }
          await archive.finalize();
        } catch (e) {
          fail(e);
        }
      })();
    });

    if (opts.consume && filesInZip > 0) {
      await this.markConsumed(modelUserId, ids, filesInZip, opts.shootDate);
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
