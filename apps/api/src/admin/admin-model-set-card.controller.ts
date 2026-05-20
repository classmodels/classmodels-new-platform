import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { ModelSetCardService } from '../portal/model-set-card.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/set-card')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminModelSetCardController {
  constructor(
    private setCard: ModelSetCardService,
    private prisma: PrismaService,
  ) {}

  @Get('free-order-models')
  @Permissions('admin.users.read')
  async listFreeOrderModels() {
    const rows = await this.prisma.user.findMany({
      where: {
        roles: {
          some: { role: { slug: { in: ['model', 'newface', 'tryout', 'inactief'] } } },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        setCardFreeOrder: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take: 500,
    });
    return rows;
  }

  @Patch('free-order')
  @Permissions('admin.users.write')
  async patchFreeOrder(@Body() body: { userId: string; free: boolean }) {
    if (!body?.userId) throw new BadRequestException('userId verplicht');
    await this.prisma.user.update({
      where: { id: body.userId },
      data: { setCardFreeOrder: !!body.free },
    });
    return { ok: true, userId: body.userId, setCardFreeOrder: !!body.free };
  }

  @Get('users/:userId/preview-recto.pdf')
  @Permissions('admin.users.read')
  async adminRecto(@Param('userId', ParseUUIDPipe) userId: string, @Res({ passthrough: false }) res: Response) {
    const pdf = await this.setCard.previewRectoPdf(userId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="setkaart-voorzijde.pdf"');
    res.send(Buffer.from(pdf));
  }

  @Get('users/:userId/preview-verso.pdf')
  @Permissions('admin.users.read')
  async adminVerso(@Param('userId', ParseUUIDPipe) userId: string, @Res({ passthrough: false }) res: Response) {
    const pdf = await this.setCard.previewVersoPdf(userId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="setkaart-achterzijde.pdf"');
    res.send(Buffer.from(pdf));
  }

  @Get('users/:userId/preview.zip')
  @Permissions('admin.users.read')
  async adminZip(@Param('userId', ParseUUIDPipe) userId: string, @Res({ passthrough: false }) res: Response) {
    const zip = await this.setCard.previewZip(userId);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="setkaart-preview.zip"');
    res.send(zip);
  }
}
