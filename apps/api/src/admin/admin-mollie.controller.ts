import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PatchMollieSettingsDto } from './dto/mollie-settings.dto';

function maskKey(k: string | null | undefined) {
  if (!k) return null;
  if (k.length <= 12) return '***';
  return `${k.slice(0, 6)}…${k.slice(-4)}`;
}

@Controller('admin/mollie-settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminMollieController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Permissions('admin.billing.read')
  async get() {
    const s = await this.prisma.mollieSettings.findUnique({ where: { id: 1 } });
    if (!s) {
      return await this.prisma.mollieSettings.create({
        data: { id: 1 },
      });
    }
    return {
      id: s.id,
      apiKeyTest: maskKey(s.apiKeyTest),
      apiKeyLive: maskKey(s.apiKeyLive),
      webhookUrl: s.webhookUrl,
      premiumPrice: s.premiumPrice.toString(),
      tryoutPrice: s.tryoutPrice.toString(),
      updatedAt: s.updatedAt,
    };
  }

  @Patch()
  @Permissions('admin.billing.write')
  async patch(@Body() dto: PatchMollieSettingsDto) {
    const data: Record<string, unknown> = {};
    if (dto.webhookUrl !== undefined) data.webhookUrl = dto.webhookUrl || null;
    if (dto.premiumPrice != null) {
      data.premiumPrice = new Prisma.Decimal(dto.premiumPrice);
    }
    if (dto.tryoutPrice != null) {
      data.tryoutPrice = new Prisma.Decimal(dto.tryoutPrice);
    }
    if (dto.apiKeyTest !== undefined && dto.apiKeyTest !== '') {
      data.apiKeyTest = dto.apiKeyTest;
    }
    if (dto.apiKeyLive !== undefined && dto.apiKeyLive !== '') {
      data.apiKeyLive = dto.apiKeyLive;
    }
    const s = await this.prisma.mollieSettings.upsert({
      where: { id: 1 },
      update: data as never,
      create: { id: 1, ...(data as object) },
    });
    return {
      id: s.id,
      apiKeyTest: maskKey(s.apiKeyTest),
      apiKeyLive: maskKey(s.apiKeyLive),
      webhookUrl: s.webhookUrl,
      premiumPrice: s.premiumPrice.toString(),
      tryoutPrice: s.tryoutPrice.toString(),
      updatedAt: s.updatedAt,
    };
  }
}
