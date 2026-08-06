import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { resolvePublicWebUrl } from '../auth/public-web-url';
import { sendHtmlMailDetailed } from '../mail/send-html-mail';
import { PrismaService } from '../prisma/prisma.service';
import { ModelPortalHistoryService } from './model-portal-history.service';

class ModelContactDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  subject!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(8000)
  message!: string;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function bureauInbox(): string {
  return (
    process.env.CONTACT_EMAIL?.trim() ||
    process.env.SET_CARD_BUREAU_EMAIL?.trim() ||
    'info@class-models.be'
  );
}

@Controller('portal/model/contact')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PortalModelContactController {
  private readonly log = new Logger(PortalModelContactController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly history: ModelPortalHistoryService,
  ) {}

  @Post()
  @Permissions('portal.model.history.read')
  async send(@Req() req: { user: JwtPayload }, @Body() dto: ModelContactDto) {
    const isStaff =
      req.user.roles.includes('admin') ||
      req.user.permissions.includes('*') ||
      req.user.permissions.some((p) => p.startsWith('admin.'));
    if (!req.user.isPremium && !isStaff) {
      throw new ForbiddenException('Bericht sturen is alleen beschikbaar met premium.');
    }

    const subject = dto.subject.trim().replace(/\s+/g, ' ');
    const message = dto.message.trim();
    if (subject.length < 2) throw new BadRequestException('Onderwerp is verplicht.');
    if (message.length < 10) throw new BadRequestException('Bericht is te kort.');

    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        modelSheet: true,
      },
    });
    if (!user) throw new BadRequestException('Account niet gevonden.');

    const name =
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;
    const sheet =
      user.modelSheet && typeof user.modelSheet === 'object' && !Array.isArray(user.modelSheet)
        ? (user.modelSheet as Record<string, unknown>)
        : null;
    const gsmFromSheet = typeof sheet?.gsmModel === 'string' ? sheet.gsmModel.trim() : '';
    const phone = (user.phone || gsmFromSheet || '—').trim() || '—';
    const profileUrl = `${resolvePublicWebUrl()}/admin/modellen-profielen?user=${encodeURIComponent(user.id)}`;

    const html = `
      <div style="font-family:Georgia,serif;font-size:15px;line-height:1.55;color:#1a1a1a;max-width:640px;">
        <p style="margin:0 0 16px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#856b3f;">
          Bericht via modellenportaal
        </p>
        <h2 style="margin:0 0 18px;font-size:20px;font-weight:600;">${esc(subject)}</h2>
        <div style="white-space:pre-wrap;margin:0 0 28px;">${esc(message)}</div>
        <hr style="border:none;border-top:1px solid #e5e0d6;margin:0 0 18px;" />
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#856b3f;">Model</p>
        <p style="margin:0 0 4px;"><strong>Naam:</strong> ${esc(name)}</p>
        <p style="margin:0 0 4px;"><strong>GSM:</strong> ${esc(phone)}</p>
        <p style="margin:0 0 4px;"><strong>E-mail:</strong> <a href="mailto:${esc(user.email)}">${esc(user.email)}</a></p>
        <p style="margin:12px 0 0;">
          <a href="${esc(profileUrl)}" style="color:#856b3f;font-weight:600;">Open profiel in admin →</a>
        </p>
      </div>
    `.trim();

    const to = bureauInbox();
    const mailSubject = `[Model] ${subject}`.slice(0, 200);
    const result = await sendHtmlMailDetailed(this.prisma, to, mailSubject, html, {
      replyTo: user.email,
      fast: true,
    });

    if (!result.ok) {
      this.log.error(`Model-contactmail mislukt → ${to}: ${result.error ?? 'onbekend'}`);
      throw new BadRequestException(
        'Bericht kon niet worden verstuurd. Probeer later opnieuw of bel Class-Models.',
      );
    }

    await this.history.log(req.user.sub, 'message_sent', {
      subject: subject.slice(0, 200),
      bodyChars: message.length,
      to,
    });

    return { ok: true };
  }
}
