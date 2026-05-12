import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

export type WebPushPayload = {
  title: string;
  body: string;
  /** Pad of volledige URL om te openen bij tik op melding */
  url: string;
  badgeUnread?: number;
};

@Injectable()
export class WebPushDeliveryService {
  private readonly log = new Logger(WebPushDeliveryService.name);
  private readonly vapidOk: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const pub = this.config.get<string>('VAPID_PUBLIC_KEY')?.trim();
    const priv = this.config.get<string>('VAPID_PRIVATE_KEY')?.trim();
    const contact = this.config.get<string>('VAPID_CONTACT_EMAIL')?.trim() ?? 'mailto:info@class-models.be';
    if (pub && priv) {
      webpush.setVapidDetails(contact.startsWith('mailto:') ? contact : `mailto:${contact}`, pub, priv);
      this.vapidOk = true;
    } else {
      this.vapidOk = false;
      this.log.warn('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY ontbreken — geen Web Push naar apparaten.');
    }
  }

  isConfigured(): boolean {
    return this.vapidOk;
  }

  getPublicKey(): string | null {
    const pub = this.config.get<string>('VAPID_PUBLIC_KEY')?.trim();
    return pub && this.vapidOk ? pub : null;
  }

  async sendToUser(userId: string, payload: WebPushPayload): Promise<void> {
    if (!this.vapidOk) return;
    const subs = await this.prisma.webPushSubscription.findMany({ where: { userId } });
    const body = JSON.stringify(payload);
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          body,
        );
      } catch (e: unknown) {
        const status = typeof e === 'object' && e && 'statusCode' in e ? (e as { statusCode?: number }).statusCode : undefined;
        if (status === 404 || status === 410) {
          await this.prisma.webPushSubscription.deleteMany({ where: { id: s.id } }).catch(() => undefined);
        } else {
          this.log.warn(`WebPush fail user=${userId} sub=${s.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  }
}
