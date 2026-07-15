import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { RegisterPwaDto } from './dto/push.dto';

@Injectable()
export class ModelPwaService {
  constructor(private readonly prisma: PrismaService) {}

  private deviceKeyFrom(userId: string, deviceId: string | undefined, userAgent: string | undefined): string {
    if (deviceId?.trim()) return deviceId.trim().slice(0, 120);
    const ua = (userAgent || 'unknown').slice(0, 500);
    return createHash('sha256').update(`${userId}:${ua}`).digest('hex').slice(0, 64);
  }

  private platformFromUserAgent(ua: string | undefined): string {
    if (!ua) return 'unknown';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'desktop';
  }

  async register(userId: string, dto: RegisterPwaDto, userAgent?: string) {
    const deviceKey = this.deviceKeyFrom(userId, dto.deviceId, userAgent);
    const platform = dto.platform?.trim() || this.platformFromUserAgent(userAgent);

    return this.prisma.modelPwaDevice.upsert({
      where: { userId_deviceKey: { userId, deviceKey } },
      create: {
        userId,
        deviceKey,
        userAgent: userAgent?.slice(0, 2000) || null,
        displayMode: dto.displayMode || 'standalone',
        platform,
        installSource: dto.source || null,
      },
      update: {
        userAgent: userAgent?.slice(0, 2000) || undefined,
        displayMode: dto.displayMode || undefined,
        platform,
        ...(dto.source ? { installSource: dto.source } : {}),
        lastSeenAt: new Date(),
      },
    });
  }

  async listDevicesOverview() {
    const [pwaDevices, pushSubs] = await Promise.all([
      this.prisma.modelPwaDevice.findMany({
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
        orderBy: { lastSeenAt: 'desc' },
      }),
      this.prisma.webPushSubscription.findMany({
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    type ModelRow = {
      userId: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      appDevices: Array<{
        id: string;
        displayMode: string;
        platform: string | null;
        installSource: string | null;
        userAgent: string | null;
        firstSeenAt: Date;
        lastSeenAt: Date;
      }>;
      pushDevices: Array<{
        id: string;
        endpointPreview: string;
        userAgent: string | null;
        createdAt: Date;
      }>;
    };

    const byUser = new Map<string, ModelRow>();

    const ensure = (user: { id: string; email: string; firstName: string | null; lastName: string | null }) => {
      let row = byUser.get(user.id);
      if (!row) {
        row = {
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          appDevices: [],
          pushDevices: [],
        };
        byUser.set(user.id, row);
      }
      return row;
    };

    for (const d of pwaDevices) {
      ensure(d.user).appDevices.push({
        id: d.id,
        displayMode: d.displayMode,
        platform: d.platform,
        installSource: d.installSource,
        userAgent: d.userAgent,
        firstSeenAt: d.firstSeenAt,
        lastSeenAt: d.lastSeenAt,
      });
    }

    for (const p of pushSubs) {
      ensure(p.user).pushDevices.push({
        id: p.id,
        endpointPreview: p.endpoint.length > 48 ? `${p.endpoint.slice(0, 48)}…` : p.endpoint,
        userAgent: p.userAgent,
        createdAt: p.createdAt,
      });
    }

    const models = [...byUser.values()]
      .map((m) => ({
        ...m,
        hasApp: m.appDevices.length > 0,
        hasPush: m.pushDevices.length > 0,
      }))
      .sort((a, b) => {
        const aTs = Math.max(
          ...a.appDevices.map((d) => d.lastSeenAt.getTime()),
          ...a.pushDevices.map((d) => d.createdAt.getTime()),
          0,
        );
        const bTs = Math.max(
          ...b.appDevices.map((d) => d.lastSeenAt.getTime()),
          ...b.pushDevices.map((d) => d.createdAt.getTime()),
          0,
        );
        return bTs - aTs;
      });

    return {
      stats: {
        modelsWithApp: models.filter((m) => m.hasApp).length,
        modelsWithPush: models.filter((m) => m.hasPush).length,
        totalAppDevices: pwaDevices.length,
        totalPushSubscriptions: pushSubs.length,
      },
      models,
    };
  }
}
