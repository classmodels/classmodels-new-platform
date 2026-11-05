import { Body, Controller, Get, Headers, Patch, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { PrismaService } from '../prisma/prisma.service';

/** Alleen de website-server kent dit. Staat niet in de browser. */
export const MODEL_INTAKE_RUNTIME_TOKEN = 'cm-model-intake-runtime-v1';

type SettingsRow = {
  openaiKey: string | null;
  mollieKey: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPass: string | null;
  smtpFrom: string | null;
};

@Controller()
export class AdminModelIntakeSettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('admin/model-intake-settings')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.users.read')
  async get() {
    const row = await this.read();
    return {
      hasOpenai: Boolean(row?.openaiKey?.trim()),
      hasMollie: Boolean(row?.mollieKey?.trim()),
      smtpHost: row?.smtpHost || '',
      smtpPort: row?.smtpPort || 587,
      smtpUser: row?.smtpUser || '',
      smtpFrom: row?.smtpFrom || '',
      hasSmtpPass: Boolean(row?.smtpPass?.trim()),
    };
  }

  @Patch('admin/model-intake-settings')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.users.read')
  async patch(@Body() body: Partial<SettingsRow> & { openaiKey?: string; mollieKey?: string; smtpPass?: string }) {
    await this.prisma.ensureModelIntakeSettings();
    const prev = (await this.read()) || {
      openaiKey: '',
      mollieKey: '',
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPass: '',
      smtpFrom: '',
    };
    const keep = (next: unknown, previous: string | null) => {
      const value = String(next ?? '').trim();
      return value || previous || '';
    };
    const openaiKey = keep(body.openaiKey, prev.openaiKey);
    const mollieKey = keep(body.mollieKey, prev.mollieKey);
    const smtpPass = keep(body.smtpPass, prev.smtpPass);
    const smtpHost = body.smtpHost == null ? prev.smtpHost || '' : String(body.smtpHost).trim();
    const smtpUser = body.smtpUser == null ? prev.smtpUser || '' : String(body.smtpUser).trim();
    const smtpFrom = body.smtpFrom == null ? prev.smtpFrom || '' : String(body.smtpFrom).trim();
    const smtpPort = Number(body.smtpPort) || prev.smtpPort || 587;
    await this.prisma.$executeRaw`
      INSERT INTO ModelIntakeSettings (id, openaiKey, mollieKey, smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom)
      VALUES (1, ${openaiKey}, ${mollieKey}, ${smtpHost}, ${smtpPort}, ${smtpUser}, ${smtpPass}, ${smtpFrom})
      ON DUPLICATE KEY UPDATE
        openaiKey = ${openaiKey},
        mollieKey = ${mollieKey},
        smtpHost = ${smtpHost},
        smtpPort = ${smtpPort},
        smtpUser = ${smtpUser},
        smtpPass = ${smtpPass},
        smtpFrom = ${smtpFrom}
    `;
    return { ok: true, hasOpenai: Boolean(openaiKey) };
  }

  @Get('model-intake-settings/runtime')
  async runtime(@Headers('x-cm-model-intake') header?: string) {
    if (header !== MODEL_INTAKE_RUNTIME_TOKEN) throw new UnauthorizedException();
    const row = await this.read();
    return {
      openaiKey: row?.openaiKey || '',
      mollieKey: row?.mollieKey || '',
      smtpHost: row?.smtpHost || '',
      smtpPort: row?.smtpPort || 587,
      smtpUser: row?.smtpUser || '',
      smtpPass: row?.smtpPass || '',
      smtpFrom: row?.smtpFrom || '',
    };
  }

  private async read() {
    await this.prisma.ensureModelIntakeSettings();
    const rows = await this.prisma.$queryRaw<SettingsRow[]>`
      SELECT openaiKey, mollieKey, smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom
      FROM ModelIntakeSettings
      WHERE id = 1
    `;
    return rows[0] || null;
  }
}
