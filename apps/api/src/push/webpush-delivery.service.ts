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
    const pubRaw = this.config.get<string>('VAPID_PUBLIC_KEY')?.trim();
    const privRaw = this.config.get<string>('VAPID_PRIVATE_KEY')?.trim();
    const contact = this.config.get<string>('VAPID_CONTACT_EMAIL')?.trim() ?? 'mailto:info@class-models.be';
    const pub = pubRaw ? this.normalizeVapidPublicKeyForWebPush(pubRaw) : null;
    const priv = privRaw ? this.normalizeVapidPrivateKey(privRaw) : null;
    if (pub && priv) {
      try {
        webpush.setVapidDetails(contact.startsWith('mailto:') ? contact : `mailto:${contact}`, pub, priv);
        this.vapidOk = true;
      } catch (e) {
        this.vapidOk = false;
        this.log.warn(
          `VAPID-sleutels zijn ongeldig (${e instanceof Error ? e.message : String(e)}). Zet sleutels van \`npx web-push generate-vapid-keys\` in VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (URL-safe base64, geen PEM).`,
        );
      }
    } else {
      this.vapidOk = false;
      this.log.warn('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY ontbreken of public key is onleesbaar — geen Web Push naar apparaten.');
    }
  }

  isConfigured(): boolean {
    return this.vapidOk;
  }

  getPublicKey(): string | null {
    const pubRaw = this.config.get<string>('VAPID_PUBLIC_KEY')?.trim();
    if (!pubRaw || !this.vapidOk) return null;
    return this.normalizeVapidPublicKeyForWebPush(pubRaw);
  }

  /** 65 bytes voor `applicationServerKey` — vermijd browser-base64 edge cases. */
  getPublicKeyBytes(): number[] | null {
    const s = this.getPublicKey();
    if (!s) return null;
    try {
      const buf = Buffer.from(s, 'base64url');
      if (buf.length !== 65 || buf[0] !== 0x04) return null;
      return Array.from(buf);
    } catch {
      return null;
    }
  }

  /**
   * Browser `pushManager.subscribe` verwacht dezelfde URL-safe base64 als web-push (65 bytes uncompressed P-256).
   */
  private normalizeVapidPublicKeyForWebPush(raw: string): string | null {
    let k = raw.trim().replace(/^["']|["']$/g, '');
    k = k.replace(/\s+/g, '');
    if (!k || k.includes('BEGIN')) return null;
    k = k.replace(/=+$/, '');
    try {
      let buf = Buffer.from(k, 'base64url');
      if (buf.length === 65 && buf[0] === 0x04) {
        return buf.toString('base64url').replace(/=+$/, '');
      }
      const alt = Buffer.from(k.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      if (alt.length === 65 && alt[0] === 0x04) {
        return alt.toString('base64url').replace(/=+$/, '');
      }
      if (alt.length === 64) {
        buf = Buffer.concat([Buffer.from([0x04]), alt]);
        return buf.toString('base64url').replace(/=+$/, '');
      }
    } catch {
      return null;
    }
    return null;
  }

  private normalizeVapidPrivateKey(raw: string): string | null {
    let k = raw.trim().replace(/^["']|["']$/g, '');
    k = k.replace(/\s+/g, '');
    k = k.replace(/=+$/, '');
    try {
      const buf = Buffer.from(k, 'base64url');
      if (buf.length === 32) return k;
      const alt = Buffer.from(k.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      if (alt.length === 32) return alt.toString('base64url').replace(/=+$/, '');
    } catch {
      return null;
    }
    return null;
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
