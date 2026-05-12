import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModelPushService } from './model-push.service';
import type {
  AddListMemberDto,
  BroadcastPushDto,
  CreatePushListDto,
  PatchPushListDto,
} from './dto/push.dto';

@Injectable()
export class AdminPushService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modelPush: ModelPushService,
  ) {}

  async listLists() {
    return this.prisma.pushRecipientList.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { members: true } } },
    });
  }

  async createList(dto: CreatePushListDto, createdById: string) {
    return this.prisma.pushRecipientList.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        createdById,
      },
    });
  }

  async patchList(id: string, dto: PatchPushListDto) {
    const exists = await this.prisma.pushRecipientList.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException();
    return this.prisma.pushRecipientList.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
      },
    });
  }

  async deleteList(id: string) {
    await this.prisma.pushRecipientList.delete({ where: { id } });
    return { ok: true };
  }

  async listMembers(listId: string) {
    const list = await this.prisma.pushRecipientList.findUnique({ where: { id: listId } });
    if (!list) throw new NotFoundException();
    const members = await this.prisma.pushRecipientListMember.findMany({
      where: { listId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isPremium: true,
            premiumUntil: true,
            roles: { include: { role: { select: { slug: true, label: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return members.map((m) => ({
      userId: m.userId,
      createdAt: m.createdAt,
      user: m.user,
    }));
  }

  async addMember(listId: string, dto: AddListMemberDto) {
    const list = await this.prisma.pushRecipientList.findUnique({ where: { id: listId } });
    if (!list) throw new NotFoundException();
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('Gebruiker niet gevonden.');
    const slugs = user.roles.map((r) => r.role.slug);
    const ok = slugs.some((s) => ['model', 'newface', 'tryout', 'inactief'].includes(s));
    if (!ok) throw new ForbiddenException('Alleen modellenaccounts horen op een push-lijst.');
    await this.prisma.pushRecipientListMember.upsert({
      where: { listId_userId: { listId, userId: dto.userId } },
      create: { listId, userId: dto.userId },
      update: {},
    });
    return { ok: true };
  }

  async removeMember(listId: string, userId: string) {
    await this.prisma.pushRecipientListMember.deleteMany({ where: { listId, userId } });
    return { ok: true };
  }

  async broadcast(adminUserId: string, dto: BroadcastPushDto) {
    const userIds = await this.modelPush.resolveAudienceUserIds(dto.audienceKind, dto.listId);
    const audience = { kind: dto.audienceKind, listId: dto.listId ?? null };
    const campaign = await this.prisma.pushCampaign.create({
      data: {
        title: dto.title.trim(),
        body: dto.body.trim(),
        audience: audience as object,
        sentAt: new Date(),
        sentByUserId: adminUserId,
        recipientListId: dto.audienceKind === 'custom_list' ? dto.listId ?? null : null,
      },
    });
    if (userIds.length) {
      await this.modelPush.deliverAgencyToUsers({
        userIds,
        title: dto.title.trim(),
        body: dto.body.trim(),
        campaignId: campaign.id,
      });
    }
    return { sent: userIds.length, campaignId: campaign.id };
  }

  async recentCampaigns(takeRaw?: string) {
    const take = Math.min(Math.max(parseInt(takeRaw ?? '30', 10) || 30, 1), 100);
    return this.prisma.pushCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        sentBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        recipientList: { select: { id: true, name: true } },
      },
    });
  }
}
