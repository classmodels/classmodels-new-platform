import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BriefStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ModelPortalHistoryService } from './model-portal-history.service';

@Injectable()
export class BriefsService {
  constructor(
    private prisma: PrismaService,
    private modelHistory: ModelPortalHistoryService,
  ) {}

  listForClient(clientId: string) {
    return this.prisma.clientBrief.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { responses: true } },
      },
    });
  }

  async getForClient(clientId: string, id: string) {
    const b = await this.prisma.clientBrief.findFirst({
      where: { id, clientId },
      include: {
        responses: {
          include: {
            model: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                bio: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!b) throw new NotFoundException();
    return b;
  }

  private briefDataFromAdminInput(input: {
    title: string;
    body: string;
    extraInfo?: string | null;
    eventDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    wantedMen?: number | null;
    wantedWomen?: number | null;
    wantedChildren?: number | null;
    ageManFrom?: number | null;
    ageManTo?: number | null;
    ageWomanFrom?: number | null;
    ageWomanTo?: number | null;
    ageChildFrom?: number | null;
    ageChildTo?: number | null;
    status?: BriefStatus;
  }): Omit<Prisma.ClientBriefCreateInput, 'client'> {
    const eventDate =
      input.eventDate && input.eventDate.trim() !== ''
        ? new Date(`${input.eventDate.slice(0, 10)}T12:00:00.000Z`)
        : null;
    return {
      title: input.title,
      body: input.body,
      extraInfo: input.extraInfo ?? null,
      eventDate,
      startTime: input.startTime?.trim() || null,
      endTime: input.endTime?.trim() || null,
      wantedMen: input.wantedMen ?? null,
      wantedWomen: input.wantedWomen ?? null,
      wantedChildren: input.wantedChildren ?? null,
      ageManFrom: input.ageManFrom ?? null,
      ageManTo: input.ageManTo ?? null,
      ageWomanFrom: input.ageWomanFrom ?? null,
      ageWomanTo: input.ageWomanTo ?? null,
      ageChildFrom: input.ageChildFrom ?? null,
      ageChildTo: input.ageChildTo ?? null,
      status: input.status ?? 'open',
    };
  }

  createForClient(clientId: string, title: string, body: string) {
    return this.prisma.clientBrief.create({
      data: {
        client: { connect: { id: clientId } },
        ...this.briefDataFromAdminInput({ title, body, status: 'open' }),
      },
    });
  }

  async adminCreate(
    clientId: string,
    input: {
      title: string;
      body: string;
      extraInfo?: string | null;
      eventDate?: string | null;
      startTime?: string | null;
      endTime?: string | null;
      wantedMen?: number | null;
      wantedWomen?: number | null;
      wantedChildren?: number | null;
      ageManFrom?: number | null;
      ageManTo?: number | null;
      ageWomanFrom?: number | null;
      ageWomanTo?: number | null;
      ageChildFrom?: number | null;
      ageChildTo?: number | null;
      status?: BriefStatus;
    },
  ) {
    const client = await this.prisma.user.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Klant niet gevonden');
    return this.prisma.clientBrief.create({
      data: {
        client: { connect: { id: clientId } },
        ...this.briefDataFromAdminInput(input),
      },
      include: {
        client: { select: { email: true, companyName: true, firstName: true, lastName: true } },
        _count: { select: { responses: true } },
      },
    });
  }

  async updateForClient(
    clientId: string,
    id: string,
    dto: {
      title?: string;
      body?: string;
      status?: BriefStatus;
      extraInfo?: string | null;
      eventDate?: string | null;
      startTime?: string | null;
      endTime?: string | null;
      wantedMen?: number | null;
      wantedWomen?: number | null;
      wantedChildren?: number | null;
      ageManFrom?: number | null;
      ageManTo?: number | null;
      ageWomanFrom?: number | null;
      ageWomanTo?: number | null;
      ageChildFrom?: number | null;
      ageChildTo?: number | null;
    },
  ) {
    const b = await this.prisma.clientBrief.findFirst({ where: { id, clientId } });
    if (!b) throw new NotFoundException();
    if (dto.title != null || dto.body != null || dto.extraInfo !== undefined) {
      if (b.status !== 'open') {
        throw new ForbiddenException('Alleen open aanvragen zijn bewerkbaar');
      }
    }
    const data: Prisma.ClientBriefUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.body !== undefined) data.body = dto.body;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.extraInfo !== undefined) data.extraInfo = dto.extraInfo;
    if (dto.eventDate !== undefined) {
      data.eventDate =
        dto.eventDate && dto.eventDate.trim() !== ''
          ? new Date(`${dto.eventDate.slice(0, 10)}T12:00:00.000Z`)
          : null;
    }
    if (dto.startTime !== undefined) data.startTime = dto.startTime?.trim() || null;
    if (dto.endTime !== undefined) data.endTime = dto.endTime?.trim() || null;
    if (dto.wantedMen !== undefined) data.wantedMen = dto.wantedMen;
    if (dto.wantedWomen !== undefined) data.wantedWomen = dto.wantedWomen;
    if (dto.wantedChildren !== undefined) data.wantedChildren = dto.wantedChildren;
    if (dto.ageManFrom !== undefined) data.ageManFrom = dto.ageManFrom;
    if (dto.ageManTo !== undefined) data.ageManTo = dto.ageManTo;
    if (dto.ageWomanFrom !== undefined) data.ageWomanFrom = dto.ageWomanFrom;
    if (dto.ageWomanTo !== undefined) data.ageWomanTo = dto.ageWomanTo;
    if (dto.ageChildFrom !== undefined) data.ageChildFrom = dto.ageChildFrom;
    if (dto.ageChildTo !== undefined) data.ageChildTo = dto.ageChildTo;
    return this.prisma.clientBrief.update({ where: { id }, data });
  }

  async adminUpdate(id: string, dto: Record<string, unknown>) {
    const b = await this.prisma.clientBrief.findUnique({ where: { id } });
    if (!b) throw new NotFoundException();
    const data: Prisma.ClientBriefUpdateInput = {};
    if (dto.clientId !== undefined && typeof dto.clientId === 'string') {
      data.client = { connect: { id: dto.clientId } };
    }
    if (dto.title !== undefined) data.title = dto.title as string;
    if (dto.body !== undefined) data.body = dto.body as string;
    if (dto.status !== undefined) data.status = dto.status as BriefStatus;
    if (dto.extraInfo !== undefined) data.extraInfo = (dto.extraInfo as string | null) ?? null;
    if (dto.eventDate !== undefined) {
      const ev = dto.eventDate as string | null | undefined;
      data.eventDate =
        ev && typeof ev === 'string' && ev.trim() !== ''
          ? new Date(`${ev.slice(0, 10)}T12:00:00.000Z`)
          : null;
    }
    if (dto.startTime !== undefined) data.startTime = (dto.startTime as string | null)?.trim() || null;
    if (dto.endTime !== undefined) data.endTime = (dto.endTime as string | null)?.trim() || null;
    if (dto.wantedMen !== undefined) data.wantedMen = dto.wantedMen as number | null;
    if (dto.wantedWomen !== undefined) data.wantedWomen = dto.wantedWomen as number | null;
    if (dto.wantedChildren !== undefined) data.wantedChildren = dto.wantedChildren as number | null;
    if (dto.ageManFrom !== undefined) data.ageManFrom = dto.ageManFrom as number | null;
    if (dto.ageManTo !== undefined) data.ageManTo = dto.ageManTo as number | null;
    if (dto.ageWomanFrom !== undefined) data.ageWomanFrom = dto.ageWomanFrom as number | null;
    if (dto.ageWomanTo !== undefined) data.ageWomanTo = dto.ageWomanTo as number | null;
    if (dto.ageChildFrom !== undefined) data.ageChildFrom = dto.ageChildFrom as number | null;
    if (dto.ageChildTo !== undefined) data.ageChildTo = dto.ageChildTo as number | null;
    return this.prisma.clientBrief.update({
      where: { id },
      data,
      include: {
        client: { select: { email: true, companyName: true, firstName: true, lastName: true } },
        _count: { select: { responses: true } },
      },
    });
  }

  listOpenForModels() {
    return this.prisma.clientBrief.findMany({
      where: { status: 'open' },
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            companyName: true,
            firstName: true,
            lastName: true,
          },
        },
        responses: { select: { modelUserId: true, status: true } },
      },
    });
  }

  async getOpenForModel(briefId: string) {
    const b = await this.prisma.clientBrief.findFirst({
      where: { id: briefId, status: 'open' },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            companyName: true,
            firstName: true,
            lastName: true,
          },
        },
        responses: true,
      },
    });
    if (!b) throw new NotFoundException();
    return b;
  }

  async respondToBrief(briefId: string, modelUserId: string, message: string) {
    const brief = await this.prisma.clientBrief.findFirst({
      where: { id: briefId, status: 'open' },
    });
    if (!brief) throw new NotFoundException();
    const row = await this.prisma.modelBriefResponse.upsert({
      where: { briefId_modelUserId: { briefId, modelUserId } },
      create: { briefId, modelUserId, message, status: 'submitted' },
      update: { message, status: 'submitted' },
    });
    void this.modelHistory.log(modelUserId, 'brief_interest_submitted', {
      briefId,
      briefTitle: brief.title,
      messageChars: message.length,
    });
    return row;
  }

  async withdrawResponse(briefId: string, modelUserId: string) {
    const r = await this.prisma.modelBriefResponse.findUnique({
      where: { briefId_modelUserId: { briefId, modelUserId } },
    });
    if (!r) throw new NotFoundException();
    const brief = await this.prisma.clientBrief.findUnique({
      where: { id: briefId },
      select: { title: true },
    });
    const row = await this.prisma.modelBriefResponse.update({
      where: { id: r.id },
      data: { status: 'withdrawn' },
    });
    void this.modelHistory.log(modelUserId, 'brief_interest_withdrawn', {
      briefId,
      briefTitle: brief?.title ?? '',
    });
    return row;
  }

  adminList() {
    return this.prisma.clientBrief.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        client: { select: { email: true, companyName: true, firstName: true, lastName: true } },
        _count: { select: { responses: true } },
      },
    });
  }

  async adminPatch(id: string, dto: Record<string, unknown>) {
    return this.adminUpdate(id, dto);
  }

  async adminSetResponseStatus(responseId: string, status: 'accepted' | 'declined') {
    const r = await this.prisma.modelBriefResponse.findUnique({ where: { id: responseId } });
    if (!r) throw new NotFoundException();
    return this.prisma.modelBriefResponse.update({
      where: { id: responseId },
      data: { status },
    });
  }

  adminGet(id: string) {
    return this.prisma.clientBrief.findUnique({
      where: { id },
      include: {
        client: { select: { email: true, companyName: true, firstName: true, lastName: true } },
        responses: {
          include: {
            model: { select: { email: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }
}
