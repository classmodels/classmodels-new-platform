import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { PatchMollieSettingsDto } from './dto/mollie-settings.dto';
import { MollieTestConnectionDto } from './dto/mollie-test-connection.dto';

function maskKey(k: string | null | undefined) {
  if (!k) return null;
  if (k.length <= 12) return '***';
  return `${k.slice(0, 6)}…${k.slice(-4)}`;
}

@Controller('admin/mollie-settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminMollieController {
  constructor(
    private prisma: PrismaService,
    private payments: PaymentsService,
  ) {}

  @Get()
  @Permissions('admin.billing.read')
  async get() {
    const s = await this.prisma.mollieSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
    const status = await this.payments.getMollieAdminStatus();
    return {
      id: s.id,
      activeMode: status.activeMode,
      modeSource: status.modeSource,
      hasApiKeyTest: status.hasApiKeyTest,
      hasApiKeyLive: status.hasApiKeyLive,
      activeKeyConfigured: status.activeKeyConfigured,
      effectiveWebhookUrl: status.effectiveWebhookUrl,
      webhookIgnoredLocalhost: status.webhookIgnoredLocalhost,
      storedWebhookUrl: status.storedWebhookUrl,
      suggestedWebhookUrl: status.suggestedWebhookUrl,
      apiPublicUrl: status.apiPublicUrl,
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
    if (dto.activeMode !== undefined) data.activeMode = dto.activeMode;
    if (dto.webhookUrl !== undefined) {
      let webhookUrl = dto.webhookUrl?.trim() || null;
      if (webhookUrl && /localhost|127\.0\.0\.1/i.test(webhookUrl)) {
        const apiPublic = process.env.API_PUBLIC_URL?.replace(/\/$/, '') ?? '';
        if (apiPublic.startsWith('https://')) {
          webhookUrl = null;
        }
      }
      data.webhookUrl = webhookUrl;
    }
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
    const status = await this.payments.getMollieAdminStatus();
    return {
      id: s.id,
      activeMode: status.activeMode,
      modeSource: status.modeSource,
      hasApiKeyTest: status.hasApiKeyTest,
      hasApiKeyLive: status.hasApiKeyLive,
      activeKeyConfigured: status.activeKeyConfigured,
      effectiveWebhookUrl: status.effectiveWebhookUrl,
      webhookIgnoredLocalhost: status.webhookIgnoredLocalhost,
      storedWebhookUrl: status.storedWebhookUrl,
      suggestedWebhookUrl: status.suggestedWebhookUrl,
      apiPublicUrl: status.apiPublicUrl,
      apiKeyTest: maskKey(s.apiKeyTest),
      apiKeyLive: maskKey(s.apiKeyLive),
      webhookUrl: s.webhookUrl,
      premiumPrice: s.premiumPrice.toString(),
      tryoutPrice: s.tryoutPrice.toString(),
      updatedAt: s.updatedAt,
    };
  }

  @Post('test-connection')
  @Permissions('admin.billing.write')
  testConnection(@Body() dto: MollieTestConnectionDto) {
    return this.payments.testMollieConnection(dto.mode);
  }
}
