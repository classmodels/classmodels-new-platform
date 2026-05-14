import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { historyKindToPushMessage } from './history-push-copy';
import { WebPushDeliveryService } from './webpush-delivery.service';
import type { PatchModelPushSettingsDto, SubscribePushDto } from './dto/push.dto';

const MODEL_ROLE_SLUGS = ['model', 'newface', 'tryout', 'inactief'] as const;

function premiumNow(u: { isPremium: boolean; premiumUntil: Date | null }): boolean {
  return u.isPremium && (!u.premiumUntil || u.premiumUntil > new Date());
}

@Injectable()
export class ModelPushService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webPush: WebPushDeliveryService,
    private readonly config: ConfigService,
  ) {}

  private appBaseUrl(): string {
    const b = this.config.get<string>('APP_PUBLIC_URL')?.trim().replace(/\/$/, '');
    return b || 'http://localhost:3000';
  }

  private pushOpenPath(): string {
    const basePath = this.config.get<string>('APP_PUBLIC_BASE_PATH')?.trim() || '';
    const p = basePath ? `${basePath.replace(/\/$/, '')}/portal/model` : '/portal/model';
    return `${p}?tab=push`;
  }

  private portalModelUrl(tab: string): string {
    const basePath = this.config.get<string>('APP_PUBLIC_BASE_PATH')?.trim() || '';
    const p = basePath ? `${basePath.replace(/\/$/, '')}/portal/model` : '/portal/model';
    const q = tab === 'home' || !tab ? '' : `?tab=${encodeURIComponent(tab)}`;
    return `${this.appBaseUrl()}${p}${q}`;
  }

  async getSummaryForUser(userId: string) {
    /** Meldingen historiek + bureau altijd actief (geen uitschakelen door model). */
    await this.prisma.modelPushSettings.upsert({
      where: { userId },
      create: { userId, notifyHistoryEvents: true, notifyAgencyBroadcasts: true },
      update: { notifyHistoryEvents: true, notifyAgencyBroadcasts: true },
    });
    const unread = await this.prisma.modelPushInbox.count({ where: { userId, readAt: null } });
    return {
      unreadCount: unread,
      notifyHistoryEvents: true,
      notifyAgencyBroadcasts: true,
      webPushConfigured: this.webPush.isConfigured(),
      vapidPublicKey: this.webPush.getPublicKey(),
    };
  }

  async emitFromHistory(userId: string, kind: string, meta?: Record<string, unknown>) {
    try {
      const { title, body } = historyKindToPushMessage(kind, meta);
      const openUrl = this.portalModelUrl('push');
      await this.prisma.modelPushInbox.create({
        data: {
          userId,
          title,
          body,
          source: 'history',
          meta: { kind, ...(meta ?? {}) } as object,
        },
      });
      const unread = await this.prisma.modelPushInbox.count({ where: { userId, readAt: null } });
      await this.webPush.sendToUser(userId, {
        title,
        body,
        url: openUrl,
        badgeUnread: unread,
      });
    } catch (e) {
      console.error('ModelPushService.emitFromHistory', e);
    }
  }

  async listInbox(userId: string, takeRaw?: string) {
    const take = Math.min(Math.max(parseInt(takeRaw ?? '80', 10) || 80, 1), 200);
    return this.prisma.modelPushInbox.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        title: true,
        body: true,
        source: true,
        meta: true,
        readAt: true,
        createdAt: true,
        campaignId: true,
      },
    });
  }

  async markRead(userId: string, id: string) {
    const row = await this.prisma.modelPushInbox.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException();
    await this.prisma.modelPushInbox.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.modelPushInbox.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markReadMany(userId: string, ids: string[]) {
    const unique = [...new Set(ids)];
    if (!unique.length) throw new BadRequestException('Geen id’s.');
    await this.prisma.modelPushInbox.updateMany({
      where: { userId, id: { in: unique } },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async deleteOne(userId: string, id: string) {
    const r = await this.prisma.modelPushInbox.deleteMany({ where: { id, userId } });
    if (r.count === 0) throw new NotFoundException();
    return { ok: true };
  }

  async deleteMany(userId: string, ids: string[]) {
    const unique = [...new Set(ids)];
    if (!unique.length) throw new BadRequestException('Geen id’s.');
    await this.prisma.modelPushInbox.deleteMany({
      where: { userId, id: { in: unique } },
    });
    return { ok: true };
  }

  async patchSettings(userId: string, dto: PatchModelPushSettingsDto) {
    return this.prisma.modelPushSettings.upsert({
      where: { userId },
      create: {
        userId,
        notifyHistoryEvents: dto.notifyHistoryEvents ?? true,
        notifyAgencyBroadcasts: dto.notifyAgencyBroadcasts ?? true,
      },
      update: {
        ...(dto.notifyHistoryEvents !== undefined ? { notifyHistoryEvents: dto.notifyHistoryEvents } : {}),
        ...(dto.notifyAgencyBroadcasts !== undefined ? { notifyAgencyBroadcasts: dto.notifyAgencyBroadcasts } : {}),
      },
    });
  }

  async subscribe(userId: string, dto: SubscribePushDto, userAgent?: string) {
    const { endpoint, keys } = dto.subscription;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new BadRequestException('Ongeldig Web Push-abonnement.');
    }
    await this.prisma.webPushSubscription.upsert({
      where: { endpoint },
      create: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent ?? null,
      },
      update: {
        userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent ?? null,
      },
    });
    return { ok: true };
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.prisma.webPushSubscription.deleteMany({
      where: { userId, endpoint },
    });
    return { ok: true };
  }

  /** Admin: bepaal ontvangers voor een doelgroep. */
  async resolveAudienceUserIds(kind: string, listId?: string | null): Promise<string[]> {
    const roleFilter = {
      roles: { some: { role: { slug: { in: [...MODEL_ROLE_SLUGS] } } } },
      status: 'active' as const,
    };

    if (kind === 'all_models') {
      const rows = await this.prisma.user.findMany({
        where: roleFilter,
        select: { id: true },
      });
      return rows.map((r) => r.id);
    }

    if (kind === 'premium') {
      const rows = await this.prisma.user.findMany({
        where: roleFilter,
        select: { id: true, isPremium: true, premiumUntil: true },
      });
      return rows.filter((u) => premiumNow(u)).map((u) => u.id);
    }

    if (kind === 'non_premium') {
      const rows = await this.prisma.user.findMany({
        where: roleFilter,
        select: { id: true, isPremium: true, premiumUntil: true },
      });
      return rows.filter((u) => !premiumNow(u)).map((u) => u.id);
    }

    if (kind === 'custom_list') {
      if (!listId) throw new BadRequestException('Lijst-id verplicht voor custom_list.');
      const members = await this.prisma.pushRecipientListMember.findMany({
        where: { listId },
        select: { userId: true },
      });
      return members.map((m) => m.userId);
    }

    throw new BadRequestException(`Onbekend audience: ${kind}`);
  }

  /** Push + inbox: opdracht waar het profiel voor in aanmerking komt (alleen die groep). */
  async notifyBriefCastingEligible(userId: string, briefTitle: string, briefId: string) {
    try {
      const title = 'Opdracht — profiel in aanmerking';
      const body = `${briefTitle}: je profiel past bij de criteria. Bekijk tab Opdrachten in je portaal.`;
      const openUrl = this.portalModelUrl('opdrachten');
      await this.prisma.modelPushInbox.create({
        data: {
          userId,
          title,
          body,
          source: 'agency',
          meta: { kind: 'brief_casting_eligible', briefId, briefTitle } as object,
        },
      });
      const unread = await this.prisma.modelPushInbox.count({ where: { userId, readAt: null } });
      await this.webPush.sendToUser(userId, {
        title,
        body,
        url: openUrl,
        badgeUnread: unread,
      });
    } catch (e) {
      console.error('ModelPushService.notifyBriefCastingEligible', e);
    }
  }

  /** Prototype: na contractgeneratie informeren model (geen bijlage — contact bureau). */
  async notifyContractPrototype(userId: string, briefTitle: string) {
    try {
      const title = 'Contract (prototype)';
      const body = `Er werd een overeenkomst voorbereid voor “${briefTitle}”. Neem contact op met Class-Models voor je exemplaar.`;
      const openUrl = this.portalModelUrl('push');
      await this.prisma.modelPushInbox.create({
        data: {
          userId,
          title,
          body,
          source: 'agency',
          meta: { kind: 'brief_contract_prototype', briefTitle } as object,
        },
      });
      const unread = await this.prisma.modelPushInbox.count({ where: { userId, readAt: null } });
      await this.webPush.sendToUser(userId, {
        title,
        body,
        url: openUrl,
        badgeUnread: unread,
      });
    } catch (e) {
      console.error('ModelPushService.notifyContractPrototype', e);
    }
  }

  /** Push vanuit admin (opdrachten); zonder campagne-id. */
  async sendBriefAdminBroadcast(
    userIds: string[],
    title: string,
    body: string,
    meta?: Record<string, unknown>,
  ) {
    const openUrl = this.portalModelUrl('opdrachten');
    const unique = [...new Set(userIds)];
    for (const uid of unique) {
      await this.prisma.modelPushInbox.create({
        data: {
          userId: uid,
          title,
          body,
          source: 'agency',
          campaignId: null,
          meta: { kind: 'brief_admin_broadcast', ...(meta ?? {}) } as object,
        },
      });
      const unread = await this.prisma.modelPushInbox.count({ where: { userId: uid, readAt: null } });
      await this.webPush.sendToUser(uid, {
        title,
        body,
        url: openUrl,
        badgeUnread: unread,
      });
    }
  }

  async deliverAgencyToUsers(params: {
    userIds: string[];
    title: string;
    body: string;
    campaignId: string;
    meta?: Record<string, unknown>;
  }) {
    const openUrl = this.portalModelUrl('push');
    const unique = [...new Set(params.userIds)];
    for (const uid of unique) {
      await this.prisma.modelPushInbox.create({
        data: {
          userId: uid,
          title: params.title,
          body: params.body,
          source: 'agency',
          campaignId: params.campaignId,
          meta: (params.meta ?? {}) as object,
        },
      });
      const unread = await this.prisma.modelPushInbox.count({ where: { userId: uid, readAt: null } });
      await this.webPush.sendToUser(uid, {
        title: params.title,
        body: params.body,
        url: openUrl,
        badgeUnread: unread,
      });
    }
  }
}
