import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AgendaNotificationService } from '../agenda/agenda-notifications.service';
import { appendTrackingPixel, trackingBaseUrl, wrapBulkMailHtml } from './bulk-mail-layout';
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
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

@Injectable()
export class BulkCommsService {
  private readonly log = new Logger(BulkCommsService.name);

  private static backgroundMinRecipients(): number {
    const n = parseInt(process.env.BULK_COMMS_BACKGROUND_MIN || '30', 10);
    return Number.isFinite(n) && n > 0 ? n : 30;
  }

  private static emailDelayMs(): number {
    const n = parseInt(process.env.BULK_EMAIL_DELAY_MS || '80', 10);
    return Number.isFinite(n) && n >= 0 ? n : 80;
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
    const created = await this.prisma.bulkContactListEntry.createMany({
      data: parsed.map((p) => ({
        listId,
        email: p.email,
        phone: p.phone,
        displayName: p.displayName,
      })),
    });
    return { imported: created.count };
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
    return {
      channel: dto.channel,
      recipients: withSelection,
      total: withSelection.length,
      eligible: eligible.length,
      included: included.length,
    };
  }

  async send(dto: BulkCommsSendDto, adminUserId: string) {
    const preview = await this.preview(dto);
    const toSend = preview.recipients.filter((r) => r.include && r.eligible);
    if (!toSend.length) throw new BadRequestException('Geen ontvangers geselecteerd.');

    const campaign = await this.prisma.bulkMessageCampaign.create({
      data: {
        channel: dto.channel,
        subject: dto.channel === 'email' ? dto.subject?.trim() : null,
        bodyHtml: dto.channel === 'email' ? dto.htmlBody?.trim() : null,
        bodySms: dto.channel === 'sms' ? dto.smsBody?.trim() : null,
        listId: dto.contactListId || null,
        roleSlugs: dto.roleSlugs?.length ? dto.roleSlugs : undefined,
        sentById: adminUserId,
      },
    });

    const bgMin = BulkCommsService.backgroundMinRecipients();
    if (toSend.length >= bgMin) {
      void this.runCampaignDispatch(campaign.id, dto, toSend).catch((e) => {
        this.log.error(
          `Bulk campagne ${campaign.id} afgebroken: ${e instanceof Error ? e.message : String(e)}`,
        );
      });
      return {
        campaignId: campaign.id,
        background: true as const,
        sent: 0,
        failed: 0,
        skipped: 0,
        total: toSend.length,
        message: `Verzending gestart op de server (${toSend.length} ontvangers). Voortgang: Communicatie → Geschiedenis.`,
      };
    }

    return this.runCampaignDispatch(campaign.id, dto, toSend);
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

      for (const r of toSend) {
        const to = r.email?.trim();
        if (!to) {
          skipped += 1;
          continue;
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
        let html = wrapBulkMailHtml(htmlRaw, r.displayName);
        const trackUrl = `${baseUrl}/bulk-mail/track/${token}.gif`;
        html = appendTrackingPixel(html, trackUrl);
        const ok = await this.notifications.sendHtmlMail(to, subject, html);
        await this.prisma.bulkMessageDelivery.update({
          where: { id: delivery.id },
          data: ok
            ? { status: 'sent', sentAt: new Date() }
            : { status: 'failed', errorMessage: 'SMTP-verzending mislukt' },
        });
        if (ok) sent += 1;
        else failed += 1;
        if (emailDelay > 0) await new Promise((res) => setTimeout(res, emailDelay));
      }
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

  listCampaigns(limit = 50) {
    return this.prisma.bulkMessageCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        channel: true,
        subject: true,
        sentCount: true,
        failedCount: true,
        skippedCount: true,
        createdAt: true,
        list: { select: { id: true, name: true } },
        sentBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: { select: { deliveries: true } },
      },
    });
  }

  async getCampaign(id: string) {
    const c = await this.prisma.bulkMessageCampaign.findUnique({
      where: { id },
      include: {
        list: { select: { id: true, name: true } },
        sentBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        deliveries: {
          orderBy: [{ openedAt: 'desc' }, { sentAt: 'desc' }],
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
    if (!c) throw new NotFoundException('Campagne niet gevonden');
    const opened = c.deliveries.filter((d) => d.openedAt).length;
    const sent = c.deliveries.filter((d) => d.status === 'sent').length;
    return { ...c, stats: { sent, opened, total: c.deliveries.length } };
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

    return [...map.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, 'nl'));
  }
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
