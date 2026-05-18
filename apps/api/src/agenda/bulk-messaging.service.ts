import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgendaNotificationService } from './agenda-notifications.service';
import { coerceOutgoingEmailHtml } from './agenda-mail-placeholders';
import type { BulkMessagingPreviewDto, BulkMessagingSendDto } from './dto/agenda.dto';

@Injectable()
export class BulkMessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: AgendaNotificationService,
  ) {}

  recipientListsForAgendaAdmin() {
    return this.prisma.pushRecipientList.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, description: true },
    });
  }

  /** Rollen voor bulk-selectie (agenda-rechten; geen aparte admin.roles.read nodig). */
  rolesForBulkPicker() {
    return this.prisma.role.findMany({
      orderBy: { label: 'asc' },
      select: {
        slug: true,
        label: true,
        _count: { select: { users: true } },
      },
    });
  }

  private async resolveUserIds(dto: Pick<BulkMessagingPreviewDto, 'roleSlugs' | 'recipientListId'>): Promise<string[]> {
    const ids = new Set<string>();
    const roleSlugs = (dto.roleSlugs ?? []).filter(Boolean);
    if (roleSlugs.length) {
      const rows = await this.prisma.user.findMany({
        where: {
          status: 'active',
          roles: { some: { role: { slug: { in: roleSlugs } } } },
        },
        select: { id: true },
      });
      for (const r of rows) ids.add(r.id);
    }
    if (dto.recipientListId) {
      const list = await this.prisma.pushRecipientList.findUnique({
        where: { id: dto.recipientListId },
        select: { id: true },
      });
      if (!list) throw new NotFoundException('Push-lijst niet gevonden');
      const members = await this.prisma.pushRecipientListMember.findMany({
        where: { listId: dto.recipientListId },
        select: { userId: true },
      });
      for (const m of members) ids.add(m.userId);
    }
    return [...ids];
  }

  async preview(dto: BulkMessagingPreviewDto) {
    if (!(dto.roleSlugs?.length) && !dto.recipientListId) {
      throw new BadRequestException('Kies minstens één rol of een push-lijst.');
    }
    const userIds = await this.resolveUserIds(dto);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, status: 'active' },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
      },
    });
    const withEmail = users.filter((u) => u.email?.trim());
    const withPhone = users.filter((u) => u.phone?.trim());
    const sample = users.slice(0, 5).map((u) => ({
      id: u.id,
      name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || u.phone || u.id,
      hasEmail: !!u.email?.trim(),
      hasPhone: !!u.phone?.trim(),
    }));
    return {
      totalAccounts: users.length,
      withEmail: withEmail.length,
      withPhone: withPhone.length,
      channel: dto.channel,
      eligible:
        dto.channel === 'email' ? withEmail.length : withPhone.length,
      sample,
    };
  }

  async send(dto: BulkMessagingSendDto, _adminUserId: string) {
    if (!(dto.roleSlugs?.length) && !dto.recipientListId) {
      throw new BadRequestException('Kies minstens één rol of een push-lijst.');
    }
    const userIds = await this.resolveUserIds(dto);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, status: 'active' },
      select: { id: true, email: true, phone: true, firstName: true, lastName: true },
    });

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    if (dto.channel === 'email') {
      const subject = dto.subject?.trim();
      const htmlRaw = dto.htmlBody?.trim();
      if (!subject || !htmlRaw) throw new BadRequestException('Onderwerp en HTML-tekst zijn verplicht voor e-mail.');
      const html = coerceOutgoingEmailHtml(htmlRaw);
      for (const u of users) {
        const to = u.email?.trim();
        if (!to) {
          skipped += 1;
          continue;
        }
        const ok = await this.notifications.sendHtmlMail(to, subject, html);
        if (ok) sent += 1;
        else failed += 1;
      }
    } else {
      const text = dto.smsBody?.trim();
      if (!text) throw new BadRequestException('SMS-tekst is verplicht.');
      for (const u of users) {
        const phone = u.phone?.trim();
        if (!phone) {
          skipped += 1;
          continue;
        }
        const ok = await this.notifications.sendConfiguredSms(phone, text);
        if (ok) {
          sent += 1;
          await new Promise((r) => setTimeout(r, 120));
        } else failed += 1;
      }
    }

    return { sent, failed, skipped, total: users.length };
  }
}
