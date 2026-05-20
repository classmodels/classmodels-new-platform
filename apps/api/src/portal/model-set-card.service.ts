import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as nodemailer from 'nodemailer';
import archiver from 'archiver';
import { ModelSetCardStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { resolveMediaRoot } from '../config/resolve-media-root';
import { resolveSmtpConfig } from '../mail/mail-smtp-resolve';
import { ModelPortalHistoryService } from './model-portal-history.service';
import {
  buildModelSetCardPdfPair,
  computeAgeYears,
  modelSheetStatEntries,
  modelSheetStatLines,
} from './model-set-card-pdf';

const ALLOWED_UPLOAD_FOLDERS = new Set(['models', 'tijdelijke-uploads', 'setkaarten']);

const VERSO_EMPTY: (string | null)[] = [null, null, null, null, null];

function parseVersoSlots(raw: unknown): (string | null)[] {
  if (!Array.isArray(raw)) return [...VERSO_EMPTY];
  return [0, 1, 2, 3, 4].map((i) => {
    const x = raw[i];
    return typeof x === 'string' && x.length > 8 ? x : null;
  });
}

function normalizeVersoBody(raw: unknown): (string | null)[] {
  return parseVersoSlots(raw);
}

@Injectable()
export class ModelSetCardService {
  private readonly log = new Logger(ModelSetCardService.name);

  constructor(
    private prisma: PrismaService,
    private history: ModelPortalHistoryService,
  ) {}

  private bureauEmail(): string {
    return (
      process.env.SET_CARD_BUREAU_EMAIL?.trim() ||
      process.env.CONTACT_EMAIL?.trim() ||
      'info@class-models.be'
    );
  }

  private async ensureOwnedAssets(userId: string, ids: string[]): Promise<void> {
    const uniq = [...new Set(ids)].filter(Boolean);
    if (!uniq.length) return;
    const rows = await this.prisma.mediaAsset.findMany({
      where: {
        id: { in: uniq },
        uploadedById: userId,
        hardDeleted: false,
      },
      include: { folder: { select: { slug: true } } },
    });
    if (rows.length !== uniq.length) throw new BadRequestException('Onbekende of niet-jouw foto.');
    for (const r of rows) {
      const slug = r.folder?.slug ?? '';
      if (!ALLOWED_UPLOAD_FOLDERS.has(slug)) {
        throw new BadRequestException(`Foto ${r.id} staat niet in een toegestane map voor setkaarten.`);
      }
    }
  }

  private loadAssetBuffer(storageKey: string): Buffer {
    const root = resolveMediaRoot();
    const full = join(root, storageKey);
    return readFileSync(full);
  }

  private async buffersForPdf(userId: string, heroId: string, versoIds: string[]): Promise<{ hero: Buffer; verso: Buffer[] }> {
    await this.ensureOwnedAssets(userId, [heroId, ...versoIds]);
    const heroRow = await this.prisma.mediaAsset.findFirst({
      where: { id: heroId, uploadedById: userId, hardDeleted: false },
      select: { storageKey: true },
    });
    if (!heroRow) throw new BadRequestException('Hoofdfoto niet gevonden.');
    if (versoIds.length !== 5) throw new BadRequestException('Precies 5 achterzijde-foto’s nodig.');
    const versoBuffers: Buffer[] = [];
    for (const id of versoIds) {
      const row = await this.prisma.mediaAsset.findFirst({
        where: { id, uploadedById: userId, hardDeleted: false },
        select: { storageKey: true },
      });
      if (!row) throw new BadRequestException('Eén van de achterzijde-foto’s werd niet gevonden.');
      versoBuffers.push(this.loadAssetBuffer(row.storageKey));
    }
    return {
      hero: this.loadAssetBuffer(heroRow.storageKey),
      verso: versoBuffers,
    };
  }

  async getDraft(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        modelSheet: true,
      },
    });
    if (!user) throw new NotFoundException();

    let draft = await this.prisma.modelSetCardDraft.findUnique({ where: { userId } });
    if (!draft) {
      draft = await this.prisma.modelSetCardDraft.create({
        data: {
          userId,
          versoPhotoAssetIds: VERSO_EMPTY,
          status: ModelSetCardStatus.draft,
        },
      });
    }

    const ms = user.modelSheet && typeof user.modelSheet === 'object' && !Array.isArray(user.modelSheet)
      ? (user.modelSheet as Record<string, unknown>)
      : null;
    const age = computeAgeYears(ms?.geboortedatum);
    const stats = modelSheetStatLines(ms);
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;

    return {
      frontHeroAssetId: draft.frontHeroAssetId,
      versoPhotoAssetIds: parseVersoSlots(draft.versoPhotoAssetIds),
      status: draft.status,
      noteFromModel: draft.noteFromModel,
      submittedAt: draft.submittedAt?.toISOString() ?? null,
      profile: {
        displayName,
        ageYears: age,
        stats,
      },
    };
  }

  async saveDraft(
    userId: string,
    body: { frontHeroAssetId?: string | null; versoPhotoAssetIds?: unknown; noteFromModel?: string | null },
  ) {
    const verso =
      body.versoPhotoAssetIds === undefined ? undefined : normalizeVersoBody(body.versoPhotoAssetIds);
    if (body.frontHeroAssetId) await this.ensureOwnedAssets(userId, [body.frontHeroAssetId]);
    if (verso) {
      const filled = verso.filter((x): x is string => !!x);
      if (filled.length) await this.ensureOwnedAssets(userId, filled);
    }

    await this.prisma.modelSetCardDraft.upsert({
      where: { userId },
      create: {
        userId,
        frontHeroAssetId: body.frontHeroAssetId ?? null,
        versoPhotoAssetIds: verso ?? [...VERSO_EMPTY],
        noteFromModel: body.noteFromModel?.trim() || null,
        status: ModelSetCardStatus.draft,
      },
      update: {
        frontHeroAssetId: body.frontHeroAssetId === undefined ? undefined : body.frontHeroAssetId,
        versoPhotoAssetIds: verso === undefined ? undefined : verso,
        noteFromModel: body.noteFromModel === undefined ? undefined : body.noteFromModel?.trim() || null,
        status: ModelSetCardStatus.draft,
        submittedAt: null,
      },
    });

    return this.getDraft(userId);
  }

  async buildPdfBytes(userId: string): Promise<{
    recto: Uint8Array;
    verso: Uint8Array;
    displayName: string;
  }> {
    const draft = await this.prisma.modelSetCardDraft.findUnique({ where: { userId } });
    if (!draft?.frontHeroAssetId) throw new BadRequestException('Kies eerst een hoofdfoto.');
    const slots = parseVersoSlots(draft.versoPhotoAssetIds);
    if (slots.some((x) => !x)) {
      throw new BadRequestException('Vul alle 5 foto-posities voor de achterzijde in.');
    }
    const verso = slots as string[];

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true, modelSheet: true },
    });
    if (!user) throw new NotFoundException();

    const ms = user.modelSheet && typeof user.modelSheet === 'object' && !Array.isArray(user.modelSheet)
      ? (user.modelSheet as Record<string, unknown>)
      : null;
    const age = computeAgeYears(ms?.geboortedatum);
    const statEntries = modelSheetStatEntries(ms);
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;

    const { hero, verso: vb } = await this.buffersForPdf(userId, draft.frontHeroAssetId, verso);
    const pdfs = await buildModelSetCardPdfPair({
      heroBytes: hero,
      versoBytes: vb,
      displayName,
      ageLabel: age != null ? `${age} jaar` : null,
      statEntries,
    });

    return { ...pdfs, displayName };
  }

  async previewZip(userId: string): Promise<Buffer> {
    const { recto, verso, displayName } = await this.buildPdfBytes(userId);
    const safe = displayName.replace(/[^\w\s\-]/g, '').replace(/\s+/g, '-') || 'model';
    return this.zipPdfs([
      { name: `setkaart-voorzijde-${safe}.pdf`, data: Buffer.from(recto) },
      { name: `setkaart-achterzijde-${safe}.pdf`, data: Buffer.from(verso) },
    ]);
  }

  private zipPdfs(files: { name: string; data: Buffer }[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];
      archive.on('data', (c: Buffer) => chunks.push(c));
      archive.on('error', reject);
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      for (const f of files) archive.append(f.data, { name: f.name });
      void archive.finalize();
    });
  }

  async submit(userId: string): Promise<{ ok: true; mailed: boolean }> {
    const { recto, verso, displayName } = await this.buildPdfBytes(userId);

    const draft = await this.prisma.modelSetCardDraft.findUnique({ where: { userId } });
    const note = draft?.noteFromModel?.trim();

    await this.prisma.modelSetCardDraft.update({
      where: { userId },
      data: {
        status: ModelSetCardStatus.submitted,
        submittedAt: new Date(),
      },
    });

    void this.history.log(userId, 'set_card_submitted', {
      displayName,
      note: note ?? null,
    });

    const safeName = displayName.replace(/[^\w\s\-]/g, '').replace(/\s+/g, '-') || 'model';

    const html = `
<p>Hallo,</p>
<p>${escapeHtml(displayName)} heeft een <strong>setkaart</strong> ingestuurd via het modellenportaal.</p>
${note ? `<p><strong>Bericht van het model:</strong><br/>${escapeHtml(note)}</p>` : ''}
<p>In bijlage: <strong>voorzijde</strong> en <strong>achterzijde</strong> (twee PDF’s, A5 liggend).</p>
`;

    const mailed = await this.sendPdfMail(this.bureauEmail(), `Setkaart — ${displayName}`, html, [
      { filename: `setkaart-voorzijde-${safeName}.pdf`, content: Buffer.from(recto) },
      { filename: `setkaart-achterzijde-${safeName}.pdf`, content: Buffer.from(verso) },
    ]);
    if (!mailed) this.log.warn(`Setkaart kon niet gemaild worden naar ${this.bureauEmail()} (SMTP?).`);

    return { ok: true, mailed };
  }

  private async sendPdfMail(
    to: string,
    subject: string,
    html: string,
    attachments: { filename: string; content: Buffer }[],
  ): Promise<boolean> {
    const addr = to.trim();
    if (!addr) return false;
    let cfg: Awaited<ReturnType<typeof resolveSmtpConfig>>;
    try {
      cfg = await resolveSmtpConfig(this.prisma);
    } catch {
      return false;
    }
    if (!cfg) return false;
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    });
    try {
      await transporter.sendMail({
        from: cfg.from,
        to: addr,
        subject,
        html,
        attachments: attachments.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: 'application/pdf',
        })),
      });
      return true;
    } catch (e) {
      this.log.warn(`Setkaart mail fout: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot>');
}
