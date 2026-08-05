import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { PrismaService } from '../prisma/prisma.service';
import { coerceOutgoingEmailHtml } from '../mail/email-layout';
import { sendHtmlMail } from '../mail/send-html-mail';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class GroepDto {
  @IsOptional()
  @IsNumber()
  aantal?: number;

  @IsOptional()
  @IsString()
  van?: string;

  @IsOptional()
  @IsString()
  tot?: string;
}

class GroepenDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => GroepDto)
  mannen?: GroepDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => GroepDto)
  vrouwen?: GroepDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => GroepDto)
  kinderenJongen?: GroepDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => GroepDto)
  kinderenMeisje?: GroepDto;
}

class ExtraDienstenDto {
  @IsOptional()
  @IsNumber()
  visagiste?: number;

  @IsOptional()
  @IsNumber()
  hairstyliste?: number;

  @IsOptional()
  @IsNumber()
  fotograaf?: number;

  @IsOptional()
  @IsNumber()
  medewerker?: number;
}

class PrijsRegelDto {
  @IsString()
  label!: string;

  @IsNumber()
  bedrag!: number;
}

export class CreateClientOfferteDto {
  @IsBoolean()
  isBestelling!: boolean;

  @IsEmail()
  clientEmail!: string;

  @IsString()
  @MinLength(2)
  naam!: string;

  @IsOptional()
  @IsString()
  bedrijfsnaam?: string;

  @IsOptional()
  @IsString()
  soortBedrijf?: string;

  @IsOptional()
  @IsString()
  btw?: string;

  @IsOptional()
  @IsString()
  straat?: string;

  @IsOptional()
  @IsString()
  nr?: string;

  @IsOptional()
  @IsString()
  postcode?: string;

  @IsOptional()
  @IsString()
  gemeente?: string;

  @IsOptional()
  @IsString()
  gsm?: string;

  @IsOptional()
  @IsString()
  typeOpdracht?: string;

  @IsOptional()
  @IsString()
  opmerkingen?: string;

  @IsOptional()
  @IsString()
  datum?: string;

  @IsOptional()
  @IsBoolean()
  lingerie?: boolean;

  @IsOptional()
  @IsBoolean()
  doorpassen?: boolean;

  @IsOptional()
  @IsString()
  auteursrechten?: string;

  @IsOptional()
  @IsNumber()
  afstandKm?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => GroepenDto)
  groepen?: GroepenDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ExtraDienstenDto)
  extraDiensten?: ExtraDienstenDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PrijsRegelDto)
  prijsRegels?: PrijsRegelDto[];

  @IsOptional()
  @IsNumber()
  totaalExcl?: number;

  @IsOptional()
  @IsNumber()
  btw21?: number;

  @IsOptional()
  @IsNumber()
  totaalIncl?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function groepLabel(naam: string, g?: GroepDto): string {
  if (!g || !g.aantal) return '';
  return `${naam}: ${g.aantal} model(len) van ${g.van ?? '?'} tot ${g.tot ?? '?'}`;
}

function buildEmailBody(dto: CreateClientOfferteDto): string {
  const type = dto.isBestelling ? 'Bestelling' : 'Offerte aanvraag';
  const now = new Intl.DateTimeFormat('nl-BE', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());

  const rows: string[] = [];

  function row(label: string, val: string | undefined | null) {
    if (!val) return;
    rows.push(
      `<tr>
        <td style="padding:5px 10px 5px 0;color:#666;font-size:13px;white-space:nowrap;vertical-align:top;">${label}</td>
        <td style="padding:5px 0;font-size:13px;color:#111;">${val}</td>
      </tr>`,
    );
  }

  row('Naam', dto.naam);
  row('Bedrijfsnaam', dto.bedrijfsnaam);
  row('Soort bedrijf', dto.soortBedrijf);
  row('BTW', dto.btw);
  row('Adres', [dto.straat, dto.nr, dto.postcode, dto.gemeente].filter(Boolean).join(' '));
  row('GSM', dto.gsm);
  row('E-mail', dto.clientEmail);
  row('Type opdracht', dto.typeOpdracht);
  row('Datum', dto.datum);
  row('Lingerie / badmode', dto.lingerie ? 'Ja (+50% toeslag)' : undefined);
  row('Doorpassen', dto.doorpassen ? 'Ja (+€ 50 forfait)' : undefined);
  row('Auteursrechten', dto.auteursrechten || undefined);
  row('Afstand (km)', dto.afstandKm ? `${dto.afstandKm} km` : undefined);

  if (dto.groepen) {
    const g = dto.groepen;
    row('Mannen', groepLabel('Mannen', g.mannen) || undefined);
    row('Vrouwen', groepLabel('Vrouwen', g.vrouwen) || undefined);
    row('Kinderen (jongen)', groepLabel('K. jongen', g.kinderenJongen) || undefined);
    row('Kinderen (meisje)', groepLabel('K. meisje', g.kinderenMeisje) || undefined);
  }

  if (dto.extraDiensten) {
    const e = dto.extraDiensten;
    if (e.visagiste) row('Visagiste', `${e.visagiste}u`);
    if (e.hairstyliste) row('Hairstyliste', `${e.hairstyliste}u`);
    if (e.fotograaf) row('Fotograaf', `${e.fotograaf}u`);
    if (e.medewerker) row('Medewerk(st)er', `${e.medewerker}u`);
  }

  row('Opmerkingen', dto.opmerkingen);

  // Prijsregels tabel
  let prijsTabel = '';
  if (dto.prijsRegels && dto.prijsRegels.length > 0) {
    const regelRijen = dto.prijsRegels
      .map(
        (r) =>
          `<tr>
            <td style="padding:4px 10px 4px 0;font-size:13px;color:#333;">${r.label}</td>
            <td style="padding:4px 0;font-size:13px;text-align:right;color:#333;">€ ${fmt(r.bedrag)}</td>
          </tr>`,
      )
      .join('');

    const totaalExcl = dto.totaalExcl ?? 0;
    const btw21 = dto.btw21 ?? 0;
    const totaalIncl = dto.totaalIncl ?? 0;

    prijsTabel = `
      <h3 style="font-size:14px;font-weight:700;color:#b8922a;margin:24px 0 10px;">Prijsoverzicht (excl. BTW)</h3>
      <table style="width:100%;border-collapse:collapse;max-width:480px;">
        <tbody>${regelRijen}</tbody>
        <tfoot>
          <tr style="border-top:2px solid #ddd;">
            <td style="padding:7px 10px 3px 0;font-weight:600;font-size:13px;">Totaal excl. BTW</td>
            <td style="padding:7px 0 3px;font-weight:700;font-size:13px;text-align:right;color:#b8922a;">€ ${fmt(totaalExcl)}</td>
          </tr>
          <tr>
            <td style="padding:3px 10px 3px 0;font-size:12px;color:#888;">BTW 21%</td>
            <td style="padding:3px 0;font-size:12px;color:#888;text-align:right;">€ ${fmt(btw21)}</td>
          </tr>
          <tr>
            <td style="padding:3px 10px 6px 0;font-weight:700;font-size:15px;">Totaal incl. BTW</td>
            <td style="padding:3px 0 6px;font-weight:700;font-size:15px;text-align:right;color:#b8922a;">€ ${fmt(totaalIncl)}</td>
          </tr>
        </tfoot>
      </table>`;
  }

  return `
    <h2 style="font-size:18px;font-weight:700;color:#b8922a;margin:0 0 6px;">${type} — Class-Models</h2>
    <p style="font-size:12px;color:#888;margin:0 0 20px;">Ontvangen op ${now}</p>

    <table style="width:100%;border-collapse:collapse;max-width:560px;">
      <tbody>${rows.join('')}</tbody>
    </table>

    ${prijsTabel}

    <p style="font-size:12px;color:#888;margin-top:24px;border-top:1px solid #eee;padding-top:14px;">
      ${
        dto.isBestelling
          ? 'Dit is een <strong>bevestigde bestelling</strong>. Class-Models neemt zo snel mogelijk contact op voor verdere opvolging.'
          : 'Dit is een <strong>vrijblijvende offerteaanvraag</strong>. Class-Models bezorgt u een definitieve offerte na bespreking.'
      }
    </p>
  `;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller('portal/client/offerte')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PortalClientOfferteController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Permissions('portal.client.briefs.write')
  async create(@Body() dto: CreateClientOfferteDto): Promise<{ success: boolean }> {
    if (!dto.clientEmail) {
      throw new BadRequestException('E-mailadres is verplicht.');
    }

    const isOrder = dto.isBestelling;
    const subject = isOrder
      ? 'Class-Models — Bestelling'
      : 'Class-Models — Offerte aanvraag';

    const innerHtml = buildEmailBody(dto);
    const html = coerceOutgoingEmailHtml(innerHtml);

    const [toClient, toInfo] = await Promise.all([
      sendHtmlMail(this.prisma, dto.clientEmail, subject, html),
      sendHtmlMail(this.prisma, 'info@class-models.be', subject, html),
    ]);

    if (!toClient && !toInfo) {
      throw new BadRequestException(
        'E-mail kon niet worden verzonden. Probeer het later opnieuw.',
      );
    }

    return { success: true };
  }
}
