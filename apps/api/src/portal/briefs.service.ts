import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BriefStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BriefsService {
  constructor(private prisma: PrismaService) {}

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

  createForClient(clientId: string, title: string, body: string) {
    return this.prisma.clientBrief.create({
      data: { clientId, title, body, status: 'open' },
    });
  }

  async updateForClient(
    clientId: string,
    id: string,
    dto: { title?: string; body?: string; status?: BriefStatus },
  ) {
    const b = await this.prisma.clientBrief.findFirst({ where: { id, clientId } });
    if (!b) throw new NotFoundException();
    if (dto.title != null || dto.body != null) {
      if (b.status !== 'open') {
        throw new ForbiddenException('Alleen open aanvragen zijn bewerkbaar');
      }
    }
    const data: Prisma.ClientBriefUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.body !== undefined) data.body = dto.body;
    if (dto.status !== undefined) data.status = dto.status;
    return this.prisma.clientBrief.update({ where: { id }, data });
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
    return this.prisma.modelBriefResponse.upsert({
      where: { briefId_modelUserId: { briefId, modelUserId } },
      create: { briefId, modelUserId, message, status: 'submitted' },
      update: { message, status: 'submitted' },
    });
  }

  async withdrawResponse(briefId: string, modelUserId: string) {
    const r = await this.prisma.modelBriefResponse.findUnique({
      where: { briefId_modelUserId: { briefId, modelUserId } },
    });
    if (!r) throw new NotFoundException();
    return this.prisma.modelBriefResponse.update({
      where: { id: r.id },
      data: { status: 'withdrawn' },
    });
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

  async adminPatch(id: string, dto: { status?: BriefStatus }) {
    const b = await this.prisma.clientBrief.findUnique({ where: { id } });
    if (!b) throw new NotFoundException();
    return this.prisma.clientBrief.update({
      where: { id },
      data: { status: dto.status ?? undefined },
    });
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
