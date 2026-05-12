import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModelPushService } from '../push/model-push.service';

/** Alleen logs met dit prefix verschijnen in het modellenportaal + mogen gewist worden bij reset. */
export const MODEL_PORTAL_HISTORY_PREFIX = 'portal.model.history.';

@Injectable()
export class ModelPortalHistoryService {
  constructor(
    private prisma: PrismaService,
    private readonly modelPush: ModelPushService,
  ) {}

  async log(userId: string, kind: string, meta?: Record<string, unknown>) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: `${MODEL_PORTAL_HISTORY_PREFIX}${kind}`,
          meta: (meta ?? {}) as object,
        },
      });
      void this.modelPush.emitFromHistory(userId, kind, meta);
    } catch (e) {
      console.error('ModelPortalHistoryService.log', e);
    }
  }

  async listForUser(userId: string, takeRaw?: string) {
    const take = Math.min(Math.max(parseInt(takeRaw ?? '200', 10) || 200, 1), 500);
    return this.prisma.auditLog.findMany({
      where: {
        userId,
        action: { startsWith: MODEL_PORTAL_HISTORY_PREFIX },
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, action: true, meta: true, createdAt: true },
    });
  }

  async clearForUser(userId: string) {
    const res = await this.prisma.auditLog.deleteMany({
      where: {
        userId,
        action: { startsWith: MODEL_PORTAL_HISTORY_PREFIX },
      },
    });
    return { deleted: res.count };
  }
}
