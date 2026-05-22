import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AgendaNotificationService } from '../agenda/agenda-notifications.service';
import { appendTrackingPixel, trackingBaseUrl, webPublicBaseUrl, wrapBulkMailHtml } from './bulk-mail-layout';
import type {
  AddBulkListEntryDto,
  BulkCommsPreviewDto,
  BulkCommsSendDto,
  CreateBulkContactListDto,
  ImportBulkListEntriesDto,
  UpdateBulkContactListDto,
} from './dto/bulk-comms.dto';

export type BulkRecipientRow = {
  key: string;
  include: boolean;
  userId?: string;
  listEntryId?: string;
  email?: string;
  phone?: string;
  displayName: string;
  source: 'role' | 'list' | 'adhoc';
  eligible: boolean;
  /** Niet verstuurd: uitgeschreven of dubbel e-mailadres (alleen tonen bij uitschrijving). */
  skipReason?: 'unsubscribed' | 'duplicate';
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

@Injectable()
export class BulkCommsService {
  private readonly log = new Logger(BulkCommsService.name);

  private static backgroundMinRecipients(): number {
    const n = parseInt(process.env.BULK_COMMS_BACKGROUND_MIN || '1', 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  private static emailDelayMs(): number {
    const n = parseInt(process.env.BULK_EMAIL_DELAY_MS || '400', 10);
    return Number.isFinite(n) && n >= 0 ? n : 400;
  }

  private static emailBatchSize(): number {
    const n = parseInt(process.env.BULK_EMAIL_BATCH_SIZE || '90', 10);
    return Number.isFinite(n) && n > 0 ? n : 90;
  }

  private static emailBatchPauseMs(): number {
    const n = parseInt(process.env.BULK_EMAIL_BATCH_PAUSE_MS || '120000', 10);
    return Number.isFinite(n) && n >= 0 ? n : 120_000;
  }

  private static smtpPoolResetEvery(): number {
    const n = parseInt(process.env.BULK_EMAIL_SMTP_RESET_EVERY || '25', 10);
    return Number.isFinite(n) && n > 0 ? n : 25;
  }

  private static processBatchSize(): number {
    const n = parseInt(process.env.BULK_EMAIL_PROCESS_BATCH_SIZE || '20', 10);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 50) : 20;
  }

  private dtoFromCampaign(c: {
    channel: string;
    subject: string | null;
    bodyHtml: string | null;
    bodySms: string | null;
    listId: string | null;
    roleSlugs: unknown;
    excludedKeys: unknown;
  }): BulkCommsSendDto {
    const slugs = Array.isArray(c.roleSlugs) ? (c.roleSlugs as string[]) : undefined;
    const excluded = Array.isArray(c.excludedKeys) ? (c.excludedKeys as string[]) : undefined;
    return {
      channel: c.channel as 'email' | 'sms',
      subject: c.subject ?? undefined,
      htmlBody: c.bodyHtml ?? undefined,
      smsBody: c.bodySms ?? undefined,
      contactListId: c.listId ?? undefined,
      roleSlugs: slugs?.length ? slugs : undefined,
      excludedKeys: excluded?.length ? excluded : undefined,
    };
  }

  private async campaignProgress(campaignId: string, extra: Record<string, unknown> = {}) {
    const c = await this.prisma.bulkMessageCampaign.findUnique({
      where: { id: campaignId },
      select: {
        status: true,
        sentCount: true,
        failedCount: true,
        skippedCount: true,
        targetCount: true,
      },
    });
    if (!c) throw new NotFoundException('Campagne niet gevonden');
    const processed = c.sentCount + c.failedCount + c.skippedCount;
    const planned = c.targetCount > 0 ? c.targetCount : processed;
    const remaining = Math.max(0, planned - processed);
    return {
      campaignId,
      status: c.status,
      sentCount: c.sentCount,
      failedCount: c.failedCount,
      skippedCount: c.skippedCount,
      planned,
      processed,
      remaining,
      done: c.status === 'completed' || (planned > 0 && remaining === 0),
      ...extra,
    };
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: AgendaNotificationService,
  ) {}

  rolesForPicker() {
    return this.prisma.role.findMany({
      orderBy: { label: 'asc' },
      select: { slug: true, label: true, _count: { select: { users: true } } },
    });
  }

  listContactLists() {
    return this.prisma.bulkContactList.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        _count: { select: { entries: true, campaigns: true } },
      },
    });
  }

  async getContactList(id: string) {
    const list = await this.prisma.bulkContactList.findUnique({
      where: { id },
      include: {
        entries: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
    if (!list) throw new NotFoundException('Lijst niet gevonden');
    return list;
  }

  createContactList(dto: CreateBulkContactListDto, adminUserId: string) {
    return this.prisma.bulkContactList.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        createdById: adminUserId,
      },
    });
  }

  async updateContactList(id: string, dto: UpdateBulkContactListDto) {
    await this.ensureList(id);
    return this.prisma.bulkContactList.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
      },
    });
  }

  async deleteContactList(id: string) {
    await this.ensureList(id);
    await this.prisma.bulkContactList.delete({ where: { id } });
    return { ok: true };
  }

  async addListEntry(listId: string, dto: AddBulkListEntryDto) {
    await this.ensureList(listId);
    const email = dto.email?.trim() || null;
    const phone = dto.phone?.trim() || null;
    if (!dto.userId && !email && !phone) {
      throw new BadRequestException('Geef een gebruiker, e-mail of gsm op.');
    }
    return this.prisma.bulkContactListEntry.create({
      data: {
        listId,
        userId: dto.userId || null,
        email,
        phone,
        displayName: dto.displayName?.trim() || null,
      },
    });
  }

  async removeListEntry(listId: string, entryId: string) {
    const row = await this.prisma.bulkContactListEntry.findFirst({
      where: { id: entryId, listId },
    });
    if (!row) throw new NotFoundException('Contact niet gevonden');
    await this.prisma.bulkContactListEntry.delete({ where: { id: entryId } });
    return { ok: true };
  }

  async importListEntries(listId: string, dto: ImportBulkListEntriesDto) {
    await this.ensureList(listId);
    const parsed = parseImportLines(dto.text);
    if (!parsed.length) throw new BadRequestException('Geen geldige regels gevonden.');
    const seenEmail = new Set<string>();
    const seenPhone = new Set<string>();
    const unique = parsed.filter((p) => {
      const email = normalizeBulkEmail(p.email);
      const phone = p.phone?.replace(/\s/g, '') || null;
      if (email) {
        if (seenEmail.has(email)) return false;
        seenEmail.add(email);
      } else if (phone) {
        if (seenPhone.has(phone)) return false;
        seenPhone.add(phone);
      }
      return !!(email || phone);
    });
    const created = await this.prisma.bulkContactListEntry.createMany({
      data: unique.map((p) => ({
        listId,
        email: normalizeBulkEmail(p.email) || p.email,
        phone: p.phone,
        displayName: p.displayName,
      })),
    });
    return { imported: created.count, skippedDuplicates: parsed.length - unique.length };
  }

  /** Ontvangers voor verzenden (server-side selectie; geen grote recipients-array nodig). */
  private async recipientsToSend(dto: BulkCommsSendDto): Promise<BulkRecipientRow[]> {
    const rows = await this.resolveRecipients(dto);
    if (dto.excludedKeys?.length) {
      const excluded = new Set(dto.excludedKeys);
      return rows.filter((r) => r.eligible && !excluded.has(r.key));
    }
    if (dto.recipients?.length) {
      const selection = new Map(dto.recipients.map((r) => [r.key, r.include]));
      return rows
        .map((r) => ({
          ...r,
          include: selection.has(r.key) ? selection.get(r.key)! : r.include,
        }))
        .filter((r) => r.include && r.eligible);
    }
    return rows.filter((r) => r.eligible);
  }

  async preview(dto: BulkCommsPreviewDto) {
    const rows = await this.resolveRecipients(dto);
    const selection = new Map((dto.recipients ?? []).map((r) => [r.key, r.include]));
    const withSelection = rows.map((r) => ({
      ...r,
      include: selection.has(r.key) ? selection.get(r.key)! : true,
    }));
    const eligible = withSelection.filter((r) => r.eligible);
    const included = withSelection.filter((r) => r.include && r.eligible);
    const unsubscribed = withSelection.filter((r) => r.skipReason === 'unsubscribed').length;
    return {
      channel: dto.channel,
      recipients: withSelection,
      total: withSelection.length,
      eligible: eligible.length,
      included: included.length,
      unsubscribed,
    };
  }

  /** Start campagne (geen mail) — frontend roept daarna herhaaldelijk process-batch aan. */
  async send(dto: BulkCommsSendDto, adminUserId: string) {
    if (dto.channel === 'email' && (!dto.subject?.trim() || !dto.htmlBody?.trim())) {
      throw new BadRequestException('Onderwerp en inhoud zijn verplicht.');
    }
    if (dto.channel === 'sms' && !dto.smsBody?.trim()) {
      throw new BadRequestException('SMS-tekst is verplicht.');
    }
    if (!dto.roleSlugs?.length && !dto.contactListId?.trim() && !(dto.adhoc?.length)) {
      throw new BadRequestException('Kies rollen, een lijst of handmatige ontvangers.');
    }

    const campaign = await this.prisma.bulkMessageCampaign.create({
      data: {
        channel: dto.channel,
        subject: dto.channel === 'email' ? dto.subject?.trim() : null,
        bodyHtml: dto.channel === 'email' ? dto.htmlBody?.trim() : null,
        bodySms: dto.channel === 'sms' ? dto.smsBody?.trim() : null,
        listId: dto.contactListId || null,
        roleSlugs: dto.roleSlugs?.length ? dto.roleSlugs : undefined,
        excludedKeys: dto.excludedKeys?.length ? dto.excludedKeys : undefined,
        sentById: adminUserId,
        targetCount: 0,
        status: 'queued',
      },
    });

    return {
      campaignId: campaign.id,
      background: true as const,
      sent: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      message: 'Verzending gestart. Even geduld…',
    };
  }

  getCampaignStatus(campaignId: string) {
    return this.campaignProgress(campaignId);
  }

  async processCampaignBatch(campaignId: string, opts?: { retryFailed?: boolean }) {
    const c = await this.prisma.bulkMessageCampaign.findUnique({ where: { id: campaignId } });
    if (!c) throw new NotFoundException('Campagne niet gevonden');
    const dto = this.dtoFromCampaign(c);
    const batchSize = BulkCommsService.processBatchSize();

    if (opts?.retryFailed) {
      return this.processFailedBatch(campaignId, dto, batchSize);
    }

    if (c.status === 'completed') {
      return this.campaignProgress(campaignId, { done: true });
    }

    let all = await this.recipientsToSend(dto);
    if (!all.length) {
      await this.prisma.bulkMessageCampaign.update({
        where: { id: campaignId },
        data: { status: 'completed', targetCount: 0 },
      });
      throw new BadRequestException('Geen ontvangers geselecteerd.');
    }

    if (c.targetCount === 0) {
      await this.prisma.bulkMessageCampaign.update({
        where: { id: campaignId },
        data: { targetCount: all.length, status: 'running' },
      });
    } else {
      await this.prisma.bulkMessageCampaign.update({
        where: { id: campaignId },
        data: { status: 'running' },
      });
    }

    const existing = await this.prisma.bulkMessageDelivery.findMany({
      where: { campaignId },
      select: { email: true, phone: true },
    });
    const doneKeys = new Set(
      existing
        .map((d) => normalizeBulkEmail(d.email) || d.phone?.replace(/\s/g, '') || '')
        .filter(Boolean),
    );

    const pending = all.filter((r) => {
      const k =
        dto.channel === 'email'
          ? normalizeBulkEmail(r.email)
          : r.phone?.replace(/\s/g, '') || '';
      return k && !doneKeys.has(k);
    });

    if (!pending.length) {
      await this.prisma.bulkMessageCampaign.update({
        where: { id: campaignId },
        data: { status: 'completed' },
      });
      return this.campaignProgress(campaignId, { done: true });
    }

    const batch = pending.slice(0, batchSize);
    await this.runCampaignDispatch(campaignId, dto, batch);

    const progress = await this.campaignProgress(campaignId, {
      batchProcessed: batch.length,
    });
    if (progress.done) {
      await this.prisma.bulkMessageCampaign.update({
        where: { id: campaignId },
        data: { status: 'completed' },
      });
    }
    return progress;
  }

  private async processFailedBatch(campaignId: string, dto: BulkCommsSendDto, batchSize: number) {
    const failed = await this.prisma.bulkMessageDelivery.findMany({
      where: { campaignId, status: 'failed' },
      take: batchSize,
      orderBy: { createdAt: 'asc' },
    });
    if (!failed.length) {
      return this.campaignProgress(campaignId, { done: true, retried: 0 });
    }

    await this.prisma.bulkMessageCampaign.update({
      where: { id: campaignId },
      data: { status: 'running' },
    });

    const emailDelay = BulkCommsService.emailDelayMs();
    const subject = dto.subject?.trim()!;
    const htmlRaw = dto.htmlBody?.trim()!;
    const baseUrl = trackingBaseUrl();

    for (const d of failed) {
      const to = d.email?.trim();
      if (!to) continue;
      const token = d.trackingToken || randomUUID();
      const displayName = d.displayName?.trim() || 'Model';
      const html = this.buildBulkEmailHtml(htmlRaw, displayName, token);
      const mail = await this.notifications.sendHtmlMailDetailed(to, subject, html);
      if (mail.ok) {
        await this.prisma.bulkMessageDelivery.update({
          where: { id: d.id },
          data: { status: 'sent', sentAt: new Date(), errorMessage: null },
        });
      } else {
        await this.prisma.bulkMessageDelivery.update({
          where: { id: d.id },
          data: { errorMessage: mail.error?.slice(0, 500) || 'SMTP mislukt' },
        });
      }
      if (emailDelay > 0) await new Promise((res) => setTimeout(res, emailDelay));
    }

    const [sentTotal, failedLeft] = await Promise.all([
      this.prisma.bulkMessageDelivery.count({ where: { campaignId, status: 'sent' } }),
      this.prisma.bulkMessageDelivery.count({ where: { campaignId, status: 'failed' } }),
    ]);
    await this.prisma.bulkMessageCampaign.update({
      where: { id: campaignId },
      data: {
        sentCount: sentTotal,
        failedCount: failedLeft,
        status: failedLeft === 0 ? 'completed' : 'running',
      },
    });

    return this.campaignProgress(campaignId, {
      retried: failed.length,
      retryFailedRemaining: failedLeft,
      done: failedLeft === 0,
    });
  }

  private async runCampaignDispatch(
    campaignId: string,
    dto: BulkCommsSendDto,
    toSend: BulkRecipientRow[],
  ) {
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const emailDelay = BulkCommsService.emailDelayMs();

    if (dto.channel === 'email') {
      const subject = dto.subject?.trim();
      const htmlRaw = dto.htmlBody?.trim();
      if (!subject || !htmlRaw) throw new BadRequestException('Onderwerp en inhoud zijn verplicht.');
      const baseUrl = trackingBaseUrl();
      const batchSize = BulkCommsService.emailBatchSize();
      const batchPause = BulkCommsService.emailBatchPauseMs();
      const poolResetEvery = BulkCommsService.smtpPoolResetEvery();
      let sinceBatchPause = 0;

      for (let i = 0; i < toSend.length; i++) {
        const r = toSend[i]!;
        const to = r.email?.trim();
        if (!to) {
          skipped += 1;
          continue;
        }
        if (batchSize > 0 && sinceBatchPause >= batchSize && batchPause > 0) {
          this.log.log(
            `Bulk campagne ${campaignId}: pauze ${batchPause}ms na ${sinceBatchPause} mails (hosting rate limit)`,
          );
          this.notifications.resetSmtpPool();
          await new Promise((res) => setTimeout(res, batchPause));
          sinceBatchPause = 0;
        }
        if (poolResetEvery > 0 && i > 0 && i % poolResetEvery === 0) {
          this.notifications.resetSmtpPool();
        }

        const token = randomUUID();
        const delivery = await this.prisma.bulkMessageDelivery.create({
          data: {
            campaignId,
            userId: r.userId || null,
            email: to,
            phone: r.phone || null,
            displayName: r.displayName || null,
            trackingToken: token,
            status: 'pending',
          },
        });
        const html = this.buildBulkEmailHtml(htmlRaw, r.displayName, token);
        const mail = await this.notifications.sendHtmlMailDetailed(to, subject, html);
        await this.prisma.bulkMessageDelivery.update({
          where: { id: delivery.id },
          data: mail.ok
            ? { status: 'sent', sentAt: new Date() }
            : { status: 'failed', errorMessage: mail.error?.slice(0, 500) || 'SMTP-verzending mislukt' },
        });
        if (mail.ok) {
          sent += 1;
          sinceBatchPause += 1;
        } else failed += 1;
        if (emailDelay > 0) await new Promise((res) => setTimeout(res, emailDelay));
        if ((sent + failed + skipped) % 25 === 0) {
          await this.prisma.bulkMessageCampaign.update({
            where: { id: campaignId },
            data: { sentCount: sent, failedCount: failed, skippedCount: skipped },
          });
        }
      }
      this.notifications.resetSmtpPool();
    } else {
      const text = dto.smsBody?.trim();
      if (!text) throw new BadRequestException('SMS-tekst is verplicht.');
      for (const r of toSend) {
        const phone = r.phone?.trim();
        if (!phone) {
          skipped += 1;
          continue;
        }
        const delivery = await this.prisma.bulkMessageDelivery.create({
          data: {
            campaignId,
            userId: r.userId || null,
            email: r.email || null,
            phone,
            displayName: r.displayName || null,
            status: 'pending',
          },
        });
        const ok = await this.notifications.sendConfiguredSms(phone, text);
        await this.prisma.bulkMessageDelivery.update({
          where: { id: delivery.id },
          data: ok
            ? { status: 'sent', sentAt: new Date() }
            : { status: 'failed', errorMessage: 'SMS-verzending mislukt' },
        });
        if (ok) {
          sent += 1;
          await new Promise((res) => setTimeout(res, 120));
        } else failed += 1;
      }
    }

    await this.prisma.bulkMessageCampaign.update({
      where: { id: campaignId },
      data: { sentCount: sent, failedCount: failed, skippedCount: skipped },
    });

    return { campaignId, sent, failed, skipped, total: toSend.length, background: false as const };
  }

  listCampaigns(limit = 200) {
    return this.prisma.bulkMessageCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 500),
      select: {
        id: true,
        channel: true,
        subject: true,
        sentCount: true,
        failedCount: true,
        skippedCount: true,
        targetCount: true,
        status: true,
        createdAt: true,
        list: { select: { id: true, name: true } },
        sentBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: { select: { deliveries: true } },
      },
    });
  }

  /** Opnieuw proberen in batches (zelfde patroon als verzenden). */
  async retryFailedCampaign(campaignId: string) {
    const c = await this.prisma.bulkMessageCampaign.findUnique({ where: { id: campaignId } });
    if (!c) throw new NotFoundException('Campagne niet gevonden');
    if (c.channel !== 'email') throw new BadRequestException('Alleen e-mailcampagnes.');
    return this.processFailedBatch(campaignId, this.dtoFromCampaign(c), BulkCommsService.processBatchSize());
  }

  async getCampaign(id: string, deliveriesPage = 1, deliveriesTake = 80) {
    const page = Math.max(1, deliveriesPage);
    const take = Math.min(Math.max(deliveriesTake, 1), 200);
    const skip = (page - 1) * take;

    const c = await this.prisma.bulkMessageCampaign.findUnique({
      where: { id },
      include: {
        list: { select: { id: true, name: true } },
        sentBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    if (!c) throw new NotFoundException('Campagne niet gevonden');

    const [deliveries, deliveryTotal, opened] = await Promise.all([
      this.prisma.bulkMessageDelivery.findMany({
        where: { campaignId: id },
        orderBy: [{ openedAt: 'desc' }, { sentAt: 'desc' }],
        skip,
        take,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.bulkMessageDelivery.count({ where: { campaignId: id } }),
      this.prisma.bulkMessageDelivery.count({
        where: { campaignId: id, openedAt: { not: null } },
      }),
    ]);

    const planned = c.targetCount > 0 ? c.targetCount : deliveryTotal;
    const progress = await this.campaignProgress(id);

    return {
      ...c,
      deliveries,
      deliveriesPage: page,
      deliveriesTake: take,
      deliveriesTotal: deliveryTotal,
      stats: {
        sent: c.sentCount,
        opened,
        total: deliveryTotal,
        planned,
        done: progress.done,
      },
    };
  }

  async recordEmailOpen(token: string, meta: Record<string, unknown>) {
    const delivery = await this.prisma.bulkMessageDelivery.findUnique({
      where: { trackingToken: token },
    });
    if (!delivery) return false;
    const now = new Date();
    const prev = (delivery.openMeta as { opens?: { at: string; userAgent?: string | null; referer?: string | null }[] } | null) ?? {};
    const opens = [...(prev.opens ?? [])];
    opens.push({ at: now.toISOString(), userAgent: (meta.userAgent as string) ?? null, referer: (meta.referer as string) ?? null });
    await this.prisma.bulkMessageDelivery.update({
      where: { id: delivery.id },
      data: {
        openCount: { increment: 1 },
        openedAt: delivery.openedAt ?? now,
        lastOpenedAt: now,
        openMeta: { opens },
      },
    });
    return true;
  }

  private async ensureList(id: string) {
    const list = await this.prisma.bulkContactList.findUnique({ where: { id }, select: { id: true } });
    if (!list) throw new NotFoundException('Lijst niet gevonden');
  }

  private async resolveRecipients(dto: BulkCommsPreviewDto): Promise<BulkRecipientRow[]> {
    const hasRoles = (dto.roleSlugs?.length ?? 0) > 0;
    const hasList = !!dto.contactListId?.trim();
    const hasAdhoc = (dto.adhoc?.length ?? 0) > 0;
    if (!hasRoles && !hasList && !hasAdhoc) {
      throw new BadRequestException('Kies rollen, een contactlijst of voeg handmatige ontvangers toe.');
    }

    const map = new Map<string, BulkRecipientRow>();

    if (hasRoles) {
      const users = await this.prisma.user.findMany({
        where: {
          status: 'active',
          roles: { some: { role: { slug: { in: dto.roleSlugs! } } } },
        },
        select: { id: true, email: true, phone: true, firstName: true, lastName: true },
      });
      for (const u of users) {
        const key = `user:${u.id}`;
        map.set(key, {
          key,
          include: true,
          userId: u.id,
          email: u.email?.trim() || undefined,
          phone: u.phone?.trim() || undefined,
          displayName: displayNameFromUser(u),
          source: 'role',
          eligible: dto.channel === 'email' ? !!u.email?.trim() : !!u.phone?.trim(),
        });
      }
    }

    if (hasList) {
      const list = await this.prisma.bulkContactList.findUnique({
        where: { id: dto.contactListId },
        include: {
          entries: {
            include: {
              user: {
                select: { id: true, email: true, phone: true, firstName: true, lastName: true },
              },
            },
          },
        },
      });
      if (!list) throw new NotFoundException('Contactlijst niet gevonden');
      for (const e of list.entries) {
        const u = e.user;
        const email = (e.email || u?.email)?.trim() || undefined;
        const phone = (e.phone || u?.phone)?.trim() || undefined;
        const displayName =
          e.displayName?.trim() || (u ? displayNameFromUser(u) : email || phone || 'Contact');
        const key = e.userId ? `user:${e.userId}` : `entry:${e.id}`;
        if (map.has(key)) {
          const existing = map.get(key)!;
          if (!existing.listEntryId) existing.listEntryId = e.id;
          continue;
        }
        map.set(key, {
          key,
          include: true,
          userId: e.userId || undefined,
          listEntryId: e.id,
          email,
          phone,
          displayName,
          source: 'list',
          eligible: dto.channel === 'email' ? !!email : !!phone,
        });
      }
    }

    if (hasAdhoc) {
      dto.adhoc!.forEach((a, i) => {
        const email = a.email?.trim() || undefined;
        const phone = a.phone?.trim() || undefined;
        if (!email && !phone) return;
        const key = `adhoc:${i}`;
        map.set(key, {
          key,
          include: true,
          email,
          phone,
          displayName: a.displayName?.trim() || email || phone || `Ontvanger ${i + 1}`,
          source: 'adhoc',
          eligible: dto.channel === 'email' ? !!email : !!phone,
        });
      });
    }

    return this.finalizeRecipients([...map.values()], dto.channel);
  }

  private buildBulkEmailHtml(htmlRaw: string, displayName: string | null | undefined, token: string): string {
    const baseUrl = trackingBaseUrl();
    const unsubUrl = `${webPublicBaseUrl()}/uitschrijven?t=${encodeURIComponent(token)}`;
    let html = wrapBulkMailHtml(htmlRaw, displayName, unsubUrl);
    return appendTrackingPixel(html, `${baseUrl}/bulk-mail/track/${token}.gif`);
  }

  private async loadUnsubscribedEmails(): Promise<Set<string>> {
    const rows = await this.prisma.bulkMailUnsubscribe.findMany({ select: { email: true } });
    return new Set(rows.map((r) => normalizeBulkEmail(r.email)).filter((x): x is string => !!x));
  }

  private async finalizeRecipients(rows: BulkRecipientRow[], channel: string): Promise<BulkRecipientRow[]> {
    if (channel !== 'email') {
      return rows.sort((a, b) => a.displayName.localeCompare(b.displayName, 'nl'));
    }
    const unsub = await this.loadUnsubscribedEmails();
    const seen = new Set<string>();
    const out: BulkRecipientRow[] = [];
    for (const r of rows) {
      const norm = normalizeBulkEmail(r.email);
      if (norm && unsub.has(norm)) {
        out.push({ ...r, eligible: false, include: false, skipReason: 'unsubscribed' });
        continue;
      }
      if (norm && seen.has(norm)) continue;
      if (norm) seen.add(norm);
      out.push(r);
    }
    return out.sort((a, b) => a.displayName.localeCompare(b.displayName, 'nl'));
  }

  async listUnsubscribes(limit = 500) {
    return this.prisma.bulkMailUnsubscribe.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 2000),
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }

  async removeUnsubscribe(id: string) {
    const row = await this.prisma.bulkMailUnsubscribe.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Uitschrijving niet gevonden');
    await this.prisma.bulkMailUnsubscribe.delete({ where: { id } });
    return { ok: true, email: row.email };
  }

  async dedupeContactList(listId: string) {
    await this.ensureList(listId);
    const entries = await this.prisma.bulkContactListEntry.findMany({
      where: { listId },
      orderBy: { createdAt: 'asc' },
    });
    const seenEmail = new Set<string>();
    const seenPhone = new Set<string>();
    const toDelete: string[] = [];
    for (const e of entries) {
      const email = normalizeBulkEmail(e.email);
      const phone = e.phone?.replace(/\s/g, '') || null;
      if (email) {
        if (seenEmail.has(email)) toDelete.push(e.id);
        else seenEmail.add(email);
      } else if (phone) {
        if (seenPhone.has(phone)) toDelete.push(e.id);
        else seenPhone.add(phone);
      }
    }
    if (toDelete.length) {
      await this.prisma.bulkContactListEntry.deleteMany({ where: { id: { in: toDelete } } });
    }
    return { removed: toDelete.length, kept: entries.length - toDelete.length };
  }

  async unsubscribeInfo(token: string) {
    const delivery = await this.prisma.bulkMessageDelivery.findUnique({
      where: { trackingToken: token.trim() },
      select: { email: true, displayName: true },
    });
    if (!delivery?.email?.trim()) throw new NotFoundException('Link ongeldig of verlopen.');
    const email = normalizeBulkEmail(delivery.email);
    if (!email) throw new NotFoundException('Geen e-mail gekoppeld aan deze link.');
    const already = await this.prisma.bulkMailUnsubscribe.findUnique({ where: { email } });
    return {
      emailMasked: maskEmail(email),
      displayName: delivery.displayName?.trim() || null,
      alreadyUnsubscribed: !!already,
    };
  }

  async unsubscribeByToken(token: string) {
    const delivery = await this.prisma.bulkMessageDelivery.findUnique({
      where: { trackingToken: token.trim() },
      select: { email: true, userId: true, displayName: true },
    });
    if (!delivery?.email?.trim()) throw new NotFoundException('Link ongeldig of verlopen.');
    const email = normalizeBulkEmail(delivery.email);
    if (!email) throw new BadRequestException('Geen geldig e-mailadres.');
    await this.prisma.bulkMailUnsubscribe.upsert({
      where: { email },
      create: {
        email,
        userId: delivery.userId,
        displayName: delivery.displayName?.trim() || null,
        source: 'link',
      },
      update: {},
    });
    return { ok: true, emailMasked: maskEmail(email) };
  }
}

function normalizeBulkEmail(raw: string | null | undefined): string | null {
  const e = raw?.trim().toLowerCase();
  if (!e || !EMAIL_RE.test(e)) return null;
  return e;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***';
  const vis = local.length <= 2 ? '*' : `${local.slice(0, 2)}***`;
  return `${vis}@${domain}`;
}

function displayNameFromUser(u: {
  firstName: string | null;
  lastName: string | null;
  email?: string | null;
}): string {
  const n = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return n || u.email?.trim() || 'Model';
}

function parseImportLines(text: string): { email: string | null; phone: string | null; displayName: string | null }[] {
  const out: { email: string | null; phone: string | null; displayName: string | null }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.includes(';') ? line.split(';').map((p) => p.trim()) : [line];
    let displayName: string | null = null;
    let email: string | null = null;
    let phone: string | null = null;
    for (const p of parts) {
      if (EMAIL_RE.test(p)) email = p;
      else if (/^\+?[\d\s()./-]{8,}$/.test(p)) phone = p.replace(/\s/g, '');
      else if (p && !displayName) displayName = p;
    }
    if (!email && !phone && parts.length === 1) {
      const v = parts[0]!;
      if (EMAIL_RE.test(v)) email = v;
      else if (/^\+?[\d\s()./-]{8,}$/.test(v)) phone = v.replace(/\s/g, '');
    }
    if (email || phone) out.push({ email, phone, displayName });
  }
  return out;
}
