import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { resolveSmtpConfig, smtpTransportOptions } from '../mail/mail-smtp-resolve';
import { PrismaService } from '../prisma/prisma.service';
import type { PatchSiteSmtpSettingsDto, SiteSmtpTestDto } from './dto/site-smtp-settings.dto';

@Controller('admin/site-smtp-settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminSiteSmtpController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissions('admin.agenda.read')
  async get() {
    const row = await this.prisma.siteSmtpSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
    const envHost = process.env.SMTP_HOST?.trim();
    const effective = await resolveSmtpConfig(this.prisma);
    return {
      smtpHost: row.smtpHost,
      smtpPort: row.smtpPort ?? 587,
      smtpSecure: row.smtpSecure,
      smtpUser: row.smtpUser,
      smtpPassIsSet: !!(row.smtpPass && row.smtpPass.length > 0),
      mailFrom: row.mailFrom,
      updatedAt: row.updatedAt,
      effectiveHost: effective?.host ?? null,
      effectiveSource: effective?.source ?? null,
      envSmtpHostConfigured: !!envHost,
      smtpMisconfigured: !!effective?.user && !effective?.pass,
    };
  }

  @Patch()
  @Permissions('admin.agenda.write')
  async patch(@Body() body: PatchSiteSmtpSettingsDto) {
    const data: Record<string, unknown> = {};
    if (body.smtpHost !== undefined) {
      const h = body.smtpHost?.trim();
      data.smtpHost = h && h.length ? h : null;
    }
    if (body.smtpPort !== undefined) {
      const p = body.smtpPort;
      data.smtpPort = p != null && Number.isFinite(p) && p > 0 ? Math.min(65535, Math.floor(p)) : null;
    }
    if (body.smtpSecure !== undefined) data.smtpSecure = Boolean(body.smtpSecure);
    if (body.smtpUser !== undefined) {
      const u = body.smtpUser?.trim();
      data.smtpUser = u && u.length ? u : null;
    }
    if (body.smtpPass !== undefined && body.smtpPass !== null && body.smtpPass !== '') {
      data.smtpPass = body.smtpPass;
    }
    if (body.mailFrom !== undefined) {
      const f = body.mailFrom?.trim();
      data.mailFrom = f && f.length ? f : null;
    }
    const row = await this.prisma.siteSmtpSettings.upsert({
      where: { id: 1 },
      update: data as never,
      create: { id: 1, ...(data as object) },
    });
    const effective = await resolveSmtpConfig(this.prisma);
    return {
      smtpHost: row.smtpHost,
      smtpPort: row.smtpPort ?? 587,
      smtpSecure: row.smtpSecure,
      smtpUser: row.smtpUser,
      smtpPassIsSet: !!(row.smtpPass && row.smtpPass.length > 0),
      mailFrom: row.mailFrom,
      updatedAt: row.updatedAt,
      effectiveHost: effective?.host ?? null,
      effectiveSource: effective?.source ?? null,
      envSmtpHostConfigured: !!process.env.SMTP_HOST?.trim(),
    };
  }

  @Post('test')
  @Permissions('admin.agenda.write')
  async test(@Body() body: SiteSmtpTestDto) {
    const to = body.to?.trim();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return { ok: false as const, error: 'Geen geldig e-mailadres.' };
    }
    const cfg = await resolveSmtpConfig(this.prisma);
    if (!cfg) {
      return {
        ok: false as const,
        error:
          'Geen SMTP: vul hieronder in of zet SMTP_HOST (+ SMTP_USER/SMTP_PASS) in de server-.env (Combell).',
      };
    }
    try {
      const transporter = nodemailer.createTransport(smtpTransportOptions(cfg));
      await transporter.sendMail({
        from: cfg.from,
        to,
        subject: 'Class Models — test e-mail',
        html: `<p>Dit is een testbericht van het Class Models-platform.</p><p>Bron: <strong>${cfg.source}</strong> (${cfg.host}:${cfg.port})</p>`,
      });
      return { ok: true as const, message: `Testmail verzonden naar ${to}.` };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : 'Verzenden mislukt',
      };
    }
  }
}
