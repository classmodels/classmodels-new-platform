import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { basename, join } from 'node:path';
import type { Readable } from 'node:stream';
import type { Response } from 'express';
import archiver from 'archiver';
import type { Prisma } from '@prisma/client';
import { AgendaNotificationService } from '../agenda/agenda-notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { normalizeUploadImageFile } from '../media/normalize-upload-image';
import type { TestshootFeedbackDto } from './dto/testshoot-feedback.dto';

const ZIP_SIG_SECONDS = 900;

/** Map voor foto’s na model-download: offline op de site, wél herstelbaar backstage. */
const OFFLINE_FOLDER_SLUG = 'testshoot-offline';
const OFFLINE_FOLDER_LABEL = 'Testshoot — offline (door model gedownload)';

/** Vaste volgorde zoals op het formulier (print, mail, popup). */
const FEEDBACK_FIELD_ORDER = [
  'naam',
  'voornaam',
  'email',
  'gsm',
  'ervaring',
  'tevredenheid_fotos',
  'ingeschreven',
  'reden_nee_vrij',
  'druk',
  'ontvangst',
  'info',
  'toekomst_contact',
  'opmerkingen',
  'time',
  'ip',
] as const;

const FEEDBACK_LABELS: Record<string, string> = {
  naam: 'Naam',
  voornaam: 'Voornaam',
  email: 'E-mail',
  gsm: 'Telefoon',
  ervaring: 'Testshoot ervaren',
  tevredenheid_fotos: 'Tevredenheid foto’s',
  ingeschreven: 'Ingeschreven bij bureau',
  druk: 'Druk om in te schrijven',
  ontvangst: 'Ontvangst',
  info: 'Informatie',
  toekomst_contact: 'Contact in toekomst',
  reden_nee_vrij: 'Reden (nee inschrijven)',
  opmerkingen: 'Opmerkingen',
  time: 'Tijdstip formulier',
  ip: 'IP-adres',
};

@Injectable()
export class TestshootService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly mail: AgendaNotificationService,
  ) {}

  private esc(s: unknown): string {
    const t = s == null ? '' : String(s);
    return t
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private zipSecret(): string {
    return (
      process.env.TESTSHOOT_ZIP_SECRET ||
      process.env.JWT_SECRET ||
      'dev-testshoot-zip-secret-change-me'
    );
  }

  signZipDownload(modelId: string): { exp: number; sig: string } {
    const exp = Math.floor(Date.now() / 1000) + ZIP_SIG_SECONDS;
    const msg = `${modelId}:${exp}`;
    const sig = createHmac('sha256', this.zipSecret()).update(msg).digest('base64url');
    return { exp, sig };
  }

  verifyZipDownload(modelId: string, exp: number, sig: string): boolean {
    if (!sig || !Number.isFinite(exp)) return false;
    if (Math.floor(Date.now() / 1000) > exp) return false;
    const expected = createHmac('sha256', this.zipSecret())
      .update(`${modelId}:${exp}`)
      .digest('base64url');
    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(sig);
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  async listPublic() {
    const models = await this.prisma.testshootModel.findMany({
      where: { archived: false },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        photos: {
          where: { asset: { hardDeleted: false, folder: { slug: 'testshoot' } } },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: { asset: true },
        },
      },
    });
    return models.map((m) => ({
      id: m.id,
      name: m.name,
      downloadUnlocked: m.downloadUnlocked,
      photos: m.photos.map((p) => ({
        id: p.id,
        thumbFile: p.asset.thumbKey ?? p.asset.webpKey ?? p.asset.storageKey,
        fullFile: p.asset.webpKey ?? p.asset.storageKey,
      })),
    }));
  }

  async requestDownloadToken(modelId: string) {
    const model = await this.prisma.testshootModel.findFirst({
      where: { id: modelId, archived: false },
      include: {
        photos: { where: { asset: { hardDeleted: false, folder: { slug: 'testshoot' } } } },
      },
    });
    if (!model) throw new NotFoundException();
    if (model.photos.length === 0) throw new BadRequestException('Geen foto’s voor dit model.');
    if (!model.downloadUnlocked) {
      throw new ForbiddenException('NEED_FEEDBACK');
    }
    return this.signZipDownload(modelId);
  }

  async submitFeedback(modelId: string, dto: TestshootFeedbackDto, ip: string | undefined) {
    const model = await this.prisma.testshootModel.findFirst({
      where: { id: modelId, archived: false },
      include: {
        photos: { where: { asset: { hardDeleted: false, folder: { slug: 'testshoot' } } } },
      },
    });
    if (!model) throw new NotFoundException();
    if (model.photos.length === 0) throw new BadRequestException('Geen foto’s om te downloaden.');

    const ing = dto.ingeschreven.trim();
    if (ing === 'Nee') {
      const r = (dto.reden_nee_vrij ?? '').trim();
      if (!r) throw new BadRequestException('Vul de reden in bij “Nee” op ingeschreven.');
    }

    const payload: Prisma.InputJsonValue = {
      naam: dto.naam.trim(),
      voornaam: dto.voornaam.trim(),
      email: dto.email.trim().toLowerCase(),
      gsm: dto.gsm.trim(),
      ervaring: dto.ervaring,
      tevredenheid_fotos: dto.tevredenheid_fotos,
      ingeschreven: dto.ingeschreven,
      druk: dto.druk,
      ontvangst: dto.ontvangst,
      info: dto.info,
      toekomst_contact: dto.toekomst_contact,
      reden_nee_vrij: dto.reden_nee_vrij?.trim() ?? '',
      opmerkingen: dto.opmerkingen?.trim() ?? '',
      time: new Date().toISOString(),
      ip: ip ?? '',
    };

    await this.prisma.$transaction([
      this.prisma.testshootFeedback.create({
        data: { modelId, modelName: model.name, payload, ip: ip ?? null },
      }),
      this.prisma.testshootModel.update({
        where: { id: modelId },
        data: { downloadUnlocked: true, unlockedAt: new Date() },
      }),
    ]);

    return this.signZipDownload(modelId);
  }

  /**
   * Zip met originele bestanden (`storageKey`). Alleen actieve (niet-gearchiveerde) slots voor bezoekers.
   */
  private async streamModelPhotoZipToResponse(
    modelId: string,
    res: Response,
    opts: { requireActive: boolean; publicOnly: boolean },
  ) {
    const model = await this.prisma.testshootModel.findFirst({
      where: opts.requireActive ? { id: modelId, archived: false } : { id: modelId },
      include: {
        photos: {
          where: opts.publicOnly
            ? { asset: { hardDeleted: false, folder: { slug: 'testshoot' } } }
            : { asset: { hardDeleted: false } },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: { asset: true },
        },
      },
    });
    if (!model || model.photos.length === 0) throw new NotFoundException();

    const safeName = model.name.replace(/[^\w\s-]/g, '').trim().slice(0, 60) || 'testshoot';
    const filename = `${safeName}-fotos.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', () => {
      try {
        res.end();
      } catch {
        /* ignore */
      }
    });

    const zipEntries: { stream: Readable; name: string }[] = [];
    for (const p of model.photos) {
      const key = p.asset.storageKey;
      try {
        const stream = (await this.media.openAssetReadStream(key)) as Readable;
        zipEntries.push({
          stream,
          name: p.asset.originalName || basename(key),
        });
      } catch {
        /** ontbreekt in R2/schijf */
      }
    }
    let filesInZip = zipEntries.length;
    await new Promise<void>((resolve, reject) => {
      archive.on('error', reject);
      archive.on('end', () => resolve());
      archive.pipe(res);
      for (const entry of zipEntries) {
        archive.append(entry.stream, { name: entry.name });
      }
      void archive.finalize();
    });
    return { filesInZip };
  }

  /** Bezoeker: na geslaagde zip verdwijnen de foto’s van de publieke site, maar blijven backstage herstelbaar. */
  async streamZipToResponse(modelId: string, exp: number, sig: string, res: Response) {
    if (!this.verifyZipDownload(modelId, exp, sig)) {
      throw new ForbiddenException('Ongeldige of verlopen downloadlink.');
    }
    const { filesInZip } = await this.streamModelPhotoZipToResponse(modelId, res, { requireActive: true, publicOnly: true });
    if (filesInZip > 0) {
      await this.hidePublicPhotosAfterGuestDownload(modelId);
    }
  }

  /** Admin-backup: zelfde zip als bezoeker, zonder bestanden te wissen. */
  async adminStreamZipToResponse(modelId: string, res: Response) {
    await this.streamModelPhotoZipToResponse(modelId, res, { requireActive: false, publicOnly: false });
  }

  /** --- Admin --- */

  async adminList() {
    const rows = await this.prisma.testshootModel.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { feedbacks: true, photos: true } },
        photos: {
          where: { asset: { hardDeleted: false } },
          select: { asset: { select: { folder: { select: { slug: true } } } } },
        },
      },
    });
    return rows.map((m) => {
      const publicPhotoCount = m.photos.filter((p) => p.asset.folder?.slug === 'testshoot').length;
      return {
        id: m.id,
        name: m.name,
        sortOrder: m.sortOrder,
        archived: m.archived,
        downloadUnlocked: m.downloadUnlocked,
        unlockedAt: m.unlockedAt,
        _count: { feedbacks: m._count.feedbacks, photos: publicPhotoCount },
        hiddenPhotoCount: m.photos.length - publicPhotoCount,
      };
    });
  }

  async adminCreateModel(name?: string) {
    const last = await this.prisma.testshootModel.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const sortOrder = (last?.sortOrder ?? 0) + 1;
    return this.prisma.testshootModel.create({
      data: {
        name: name?.trim() || `Model ${sortOrder + 1}`,
        sortOrder,
        archived: false,
      },
    });
  }

  async adminRename(id: string, name: string) {
    await this.prisma.testshootModel.update({
      where: { id },
      data: { name: name.trim().slice(0, 120) || 'Model' },
    });
    return this.prisma.testshootModel.findUnique({ where: { id } });
  }

  async adminAddPhotos(modelId: string, files: Express.Multer.File[], userId: string) {
    const model = await this.prisma.testshootModel.findFirst({ where: { id: modelId } });
    if (!model) throw new NotFoundException();

    const folder = await this.prisma.mediaFolder.findUnique({ where: { slug: 'testshoot' } });
    const last = await this.prisma.testshootPhoto.findFirst({
      where: { modelId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    let order = (last?.sortOrder ?? 0) + 1;

    let added = 0;
    for (const file of files) {
      const normalized = await normalizeUploadImageFile(file);
      const asset = await this.media.saveFile(normalized, userId, folder?.id ?? undefined, {
        fileLabel: model.name,
      });
      await this.prisma.testshootPhoto.create({
        data: { modelId, assetId: asset.id, sortOrder: order++ },
      });
      added += 1;
    }
    return { added };
  }

  async adminClearPhotos(modelId: string) {
    const photos = await this.prisma.testshootPhoto.findMany({
      where: { modelId },
      select: { assetId: true },
    });
    for (const p of photos) {
      await this.media.removeAsset(p.assetId, true);
    }
    await this.prisma.testshootModel.update({
      where: { id: modelId },
      data: { downloadUnlocked: false, unlockedAt: null },
    });
    return { removed: photos.length };
  }

  async adminRestorePublicPhotos(modelId: string) {
    const model = await this.prisma.testshootModel.findFirst({
      where: { id: modelId },
      include: {
        photos: {
          where: { asset: { hardDeleted: false } },
          select: { assetId: true, asset: { select: { folder: { select: { slug: true } } } } },
        },
      },
    });
    if (!model) throw new NotFoundException();
    const assetIds = model.photos.filter((p) => p.asset.folder?.slug !== 'testshoot').map((p) => p.assetId);
    if (assetIds.length === 0) return { restored: 0 };
    const folder = await this.prisma.mediaFolder.findUnique({ where: { slug: 'testshoot' } });
    if (!folder) throw new ServiceUnavailableException('Map testshoot niet gevonden.');
    await this.media.moveAssetsToFolder(assetIds, folder.id);
    return { restored: assetIds.length };
  }

  /** Handmatig offline zetten vanuit de backsite (zelfde map als na model-download). */
  async adminSetPhotosOffline(modelId: string) {
    const model = await this.prisma.testshootModel.findFirst({ where: { id: modelId } });
    if (!model) throw new NotFoundException();
    return this.hidePublicPhotosAfterGuestDownload(modelId);
  }

  async adminArchiveModel(modelId: string) {
    // Foto’s weg; feedback blijft altijd bewaard.
    await this.adminClearPhotos(modelId);
    await this.prisma.testshootModel.update({
      where: { id: modelId },
      data: { archived: true, downloadUnlocked: false, unlockedAt: null },
    });
    return { ok: true };
  }

  async adminListFeedback(modelId: string) {
    return this.prisma.testshootFeedback.findMany({
      where: { modelId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminDeleteFeedback(feedbackId: string) {
    await this.prisma.testshootFeedback.delete({ where: { id: feedbackId } });
    return { ok: true };
  }

  async adminSetFeedbackArchived(feedbackId: string, archived: boolean) {
    await this.prisma.testshootFeedback.update({
      where: { id: feedbackId },
      data: { archived },
    });
    return { ok: true, archived };
  }

  async adminModelDetail(modelId: string) {
    const model = await this.prisma.testshootModel.findFirst({
      where: { id: modelId },
      include: {
        photos: {
          where: { asset: { hardDeleted: false } },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: { asset: { include: { folder: true } } },
        },
      },
    });
    if (!model) throw new NotFoundException();
    const publicPhotos = model.photos.filter((p) => p.asset.folder?.slug === 'testshoot');
    const hiddenPhotos = model.photos.filter((p) => p.asset.folder?.slug !== 'testshoot');
    return {
      ...model,
      photos: publicPhotos,
      publicPhotoCount: publicPhotos.length,
      hiddenPhotoCount: hiddenPhotos.length,
      hiddenPhotos,
    };
  }

  /**
   * Offline-map (niet de prullenbak): foto’s blijven op de server tot je ze
   * backstage definitief verwijdert. Prullenbak/junk-purge mag ze niet wissen.
   */
  private async ensureOfflineFolder() {
    let folder = await this.prisma.mediaFolder.findUnique({ where: { slug: OFFLINE_FOLDER_SLUG } });
    if (!folder) {
      folder = await this.prisma.mediaFolder.create({
        data: { slug: OFFLINE_FOLDER_SLUG, label: OFFLINE_FOLDER_LABEL },
      });
    }
    return folder;
  }

  private async hidePublicPhotosAfterGuestDownload(modelId: string) {
    const photos = await this.prisma.testshootPhoto.findMany({
      where: { modelId, asset: { hardDeleted: false, folder: { slug: 'testshoot' } } },
      select: { assetId: true },
    });
    const assetIds = photos.map((p) => p.assetId);
    if (!assetIds.length) return { hidden: 0 };
    const offline = await this.ensureOfflineFolder();
    await this.media.moveAssetsToFolder(assetIds, offline.id);
    return { hidden: assetIds.length };
  }

  /**
   * Verwijdert slot(s) volledig uit de database + alle gekoppelde MediaAsset-bestanden (mediatheek).
   */
  async adminPermanentDeleteByIds(ids: string[]) {
    const unique = [...new Set(ids.map((x) => x.trim()).filter(Boolean))];
    if (unique.length === 0) throw new BadRequestException('Geen id’s.');
    if (unique.length > 40) throw new BadRequestException('Maximaal 40 slots tegelijk.');

    let deletedModels = 0;
    let deletedAssets = 0;

    for (const id of unique) {
      const model = await this.prisma.testshootModel.findUnique({
        where: { id },
        include: { photos: { select: { assetId: true } } },
      });
      if (!model) continue;

      for (const p of model.photos) {
        await this.media.removeAsset(p.assetId, true);
        deletedAssets += 1;
      }

      // Feedback blijft bewaard (modelId → null via SetNull); snapshot-naam vullen.
      await this.prisma.testshootFeedback.updateMany({
        where: { modelId: id },
        data: { modelName: model.name },
      });
      await this.prisma.testshootModel.delete({ where: { id } });
      deletedModels += 1;
    }

    return { deletedModels, deletedAssets };
  }

  async adminListAllFeedbacks() {
    const rows = await this.prisma.testshootFeedback.findMany({
      orderBy: { createdAt: 'desc' },
      include: { model: { select: { name: true, archived: true } } },
    });
    return rows.map((r) => {
      const payload = this.feedbackPayload(r.payload);
      return {
        id: r.id,
        modelId: r.modelId,
        modelName: r.model?.name ?? r.modelName ?? '—',
        modelArchived: r.model?.archived ?? false,
        modelMissing: !r.modelId || !r.model,
        createdAt: r.createdAt.toISOString(),
        ip: r.ip,
        archived: r.archived,
        summary: this.feedbackSummaryLine(payload),
        rows: this.feedbackOrderedRows(payload),
      };
    });
  }

  private feedbackPayload(raw: unknown): Record<string, unknown> {
    return raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  }

  private feedbackSummaryLine(payload: Record<string, unknown>): string {
    const voornaam = String(payload.voornaam ?? '').trim();
    const naam = String(payload.naam ?? '').trim();
    const email = String(payload.email ?? '').trim();
    const base = [voornaam, naam].filter(Boolean).join(' ') || '—';
    return email ? `${base} · ${email}` : base;
  }

  /** Antwoorden in formulier-volgorde (niet alfabetisch). */
  private feedbackOrderedRows(payload: Record<string, unknown>): { label: string; value: string }[] {
    const used = new Set<string>();
    const rows: { label: string; value: string }[] = [];
    for (const key of FEEDBACK_FIELD_ORDER) {
      used.add(key);
      if (payload[key] == null || String(payload[key]).trim() === '') continue;
      rows.push({ label: FEEDBACK_LABELS[key] ?? key, value: String(payload[key]) });
    }
    for (const key of Object.keys(payload).sort()) {
      if (used.has(key)) continue;
      if (payload[key] == null || String(payload[key]).trim() === '') continue;
      rows.push({ label: FEEDBACK_LABELS[key] ?? key, value: String(payload[key]) });
    }
    return rows;
  }

  async buildFeedbackDocumentsHtml(ids: string[]): Promise<string> {
    const unique = [...new Set(ids)].filter(Boolean);
    if (unique.length === 0) throw new BadRequestException('Geen documenten geselecteerd.');
    if (unique.length > 40) throw new BadRequestException('Maximaal 40 documenten.');

    const rows = await this.prisma.testshootFeedback.findMany({
      where: { id: { in: unique } },
      include: { model: { select: { name: true } } },
    });

    const byId = new Map(rows.map((r) => [r.id, r]));
    const order = unique.map((id) => byId.get(id)).filter(Boolean) as typeof rows;
    if (order.length === 0) throw new BadRequestException('Geen geldige feedback gevonden.');

    const pages = order.map((r) =>
      this.feedbackA4Section(r, r.model?.name ?? r.modelName ?? '—'),
    );
    return `<!DOCTYPE html>
<html lang="nl"><head><meta charset="utf-8"/>
<title>Testshoot documenten</title>
<style>
@page { size: A4; margin: 14mm; }
html, body { margin: 0; padding: 0; background: #fff; color: #111; }
body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.35; }
.doc-page { page-break-after: always; break-after: page; padding: 0 2mm; min-height: 250mm; box-sizing: border-box; }
.doc-page:last-child { page-break-after: auto; break-after: auto; }
h1 { font-size: 14pt; margin: 0 0 10pt; color: #6f121b; font-family: system-ui, sans-serif; }
.meta { font-size: 9pt; color: #555; margin-bottom: 12pt; font-family: system-ui, sans-serif; }
table { width: 100%; border-collapse: collapse; font-family: system-ui, sans-serif; font-size: 10pt; }
th, td { border: 1px solid #ccc; padding: 6pt 8pt; text-align: left; vertical-align: top; }
th { width: 32%; background: #f7f2f3; color: #3d2a30; font-weight: 600; }
.path { font-size: 8pt; color: #777; margin-bottom: 8pt; font-family: system-ui, sans-serif; }
</style></head><body>
<p class="path">Class Models — Documenten / Gratis fotoshoot / Testshoot-feedback</p>
${pages.join('\n')}
</body></html>`;
  }

  private feedbackA4Section(
    row: { id: string; createdAt: Date; ip: string | null; payload: unknown },
    modelName: string,
  ): string {
    const payload = this.feedbackPayload(row.payload);
    const ordered = this.feedbackOrderedRows(payload);
    const rowsHtml = ordered
      .map((r) => `<tr><th>${this.esc(r.label)}</th><td>${this.esc(r.value)}</td></tr>`)
      .join('');

    const dateStr = row.createdAt.toLocaleString('nl-BE', { dateStyle: 'short', timeStyle: 'short' });

    return `<section class="doc-page">
<h1>Feedbackformulier testshoot</h1>
<p class="meta">Model: ${this.esc(modelName)} · Document-ID: ${this.esc(row.id)} · ${this.esc(dateStr)} · IP: ${this.esc(row.ip ?? '—')}</p>
<table>${rowsHtml}</table>
</section>`;
  }

  async adminBulkMailFeedbacks(ids: string[], to: string) {
    const addr = to.trim();
    if (!addr) throw new BadRequestException('Ontvanger (e-mail) ontbreekt.');
    const unique = [...new Set(ids.map((x) => x.trim()).filter(Boolean))];
    const html = await this.buildFeedbackDocumentsHtml(unique);
    const n = unique.length;
    const subject = `Testshoot-feedback (${n} document${n > 1 ? 'en' : ''}) — Class Models`;
    const ok = await this.mail.sendHtmlMail(addr, subject, html);
    if (!ok) {
      throw new ServiceUnavailableException(
        'E-mail niet verstuurd: configureer SMTP in de API (.env): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM (zelfde als agenda-bevestigingen).',
      );
    }
    return { sent: true, to: addr, count: n };
  }
}
