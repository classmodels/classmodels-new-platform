import { BadRequestException, Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
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
import { sendHtmlMail } from '../mail/send-html-mail';
import { CLASS_MODELS_OFFICE } from '../agenda/class-models-office';

// ─── Bedrijfsgegevens (footer mail) ──────────────────────────────────────────

const CM = {
  naam: 'Class-Models',
  adres: 'Provinciebaan 3, 2235 Hulshout',
  email: 'info@class-models.be',
  telefoon: '+32 (0) 485 322 307',
  btw: 'BE 0504.801.460',
  iban: 'BE85 9734 6507 0706 (Argenta)',
  site: 'www.class-models.be',
};

const GOLD = '#d4af6a';
const DARK = '#0e0d0d';
const PAPER = '#ffffff';
const INK = '#26221e';
const MUT = '#8a8378';
const HAIR = '#e7e1d6';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class SlotDto {
  @IsOptional()
  @IsNumber()
  aantal?: number;

  @IsOptional()
  @IsString()
  leeftijdVan?: string;

  @IsOptional()
  @IsString()
  leeftijdTot?: string;

  @IsOptional()
  @IsString()
  uurVan?: string;

  @IsOptional()
  @IsString()
  uurTot?: string;
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

  @IsOptional()
  @IsEmail()
  kopieEmail?: string;

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
  website?: string;

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
  @IsString()
  adresOpdracht?: string;

  @IsOptional()
  @IsNumber()
  afstandKm?: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SlotDto)
  slots?: SlotDto[];

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

class AfstandDto {
  @IsString()
  @MinLength(6)
  adres!: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function esc(s: string | undefined | null): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slotZin(s: SlotDto, i: number): string {
  const aantal = s.aantal ?? 0;
  const modellen = aantal === 1 ? '1 model' : `${aantal} modellen`;
  const leeftijd =
    s.leeftijdVan || s.leeftijdTot
      ? `, leeftijd ${s.leeftijdVan || '?'} tot ${s.leeftijdTot || '?'} jaar`
      : '';
  const uren = s.uurVan && s.uurTot ? `, van ${s.uurVan} tot ${s.uurTot} uur` : '';
  return `Groep ${i + 1}: ${modellen}${leeftijd}${uren}`;
}

function mailSectie(titel: string): string {
  return `<div style="margin:22px 0 12px;padding-bottom:8px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${GOLD};border-bottom:1px solid ${HAIR};">${titel}</div>`;
}

/** Compacte 2-koloms cel: label + waarde. */
function mailCel(label: string, val: string | undefined | null): string {
  if (!val) return '';
  return `<td style="width:50%;padding:0 16px 14px 0;vertical-align:top;">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${GOLD};margin-bottom:4px;">${esc(label)}</div>
    <div style="font-size:13.5px;color:${INK};line-height:1.45;">${esc(val)}</div>
  </td>`;
}

/** Rijen van 2 cellen (wat bij elkaar hoort naast elkaar). */
function mailDuo(
  a: [string, string | undefined | null],
  b?: [string, string | undefined | null],
): string {
  const left = mailCel(a[0], a[1]);
  const right = b ? mailCel(b[0], b[1]) : '<td style="width:50%;"></td>';
  if (!left && !right.replace(/<td[^>]*><\/td>/, '')) return '';
  if (!left) return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;"><tr>${right}<td style="width:50%;"></td></tr></table>`;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;"><tr>${left}${right}</tr></table>`;
}

function mailFull(label: string, val: string | undefined | null): string {
  if (!val) return '';
  return `<div style="padding:0 0 14px;">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${GOLD};margin-bottom:4px;">${esc(label)}</div>
    <div style="font-size:13.5px;color:${INK};line-height:1.5;">${esc(val)}</div>
  </div>`;
}

function buildBrandedEmail(dto: CreateClientOfferteDto): string {
  const type = dto.isBestelling ? 'Bestelling' : 'Offerteaanvraag';
  const now = new Intl.DateTimeFormat('nl-BE', { dateStyle: 'long', timeStyle: 'short' }).format(
    new Date(),
  );

  const adres = [dto.straat, dto.nr].filter(Boolean).join(' ');
  const plaats = [dto.postcode, dto.gemeente].filter(Boolean).join(' ');

  const klantBlok = [
    mailDuo(['Naam', dto.naam], ['Bedrijfsnaam', dto.bedrijfsnaam]),
    mailDuo(['Soort bedrijf', dto.soortBedrijf], ['BTW-nummer', dto.btw]),
    mailDuo(['Adres', adres], ['Postcode & gemeente', plaats]),
    mailDuo(['GSM', dto.gsm], ['E-mail', dto.clientEmail]),
    dto.website ? mailDuo(['Website', dto.website]) : '',
  ].join('');

  const slotBlok = (dto.slots ?? [])
    .filter((s) => (s.aantal ?? 0) > 0)
    .map((s, i) => mailFull(`Groep ${i + 1}`, slotZin(s, i).replace(`Groep ${i + 1}: `, '')))
    .join('');

  const e = dto.extraDiensten;
  const extras: string[] = [];
  if (e?.visagiste) extras.push(`Visagiste: ${e.visagiste}u`);
  if (e?.hairstyliste) extras.push(`Hairstyliste: ${e.hairstyliste}u`);
  if (e?.fotograaf) extras.push(`Fotograaf: ${e.fotograaf}u`);
  if (e?.medewerker) extras.push(`Medewerk(st)er: ${e.medewerker}u`);

  const opties: string[] = [];
  if (dto.doorpassen) opties.push('Doorpassen (+ € 50)');
  if (dto.lingerie) opties.push('Lingerie / badmode (+50%)');
  if (dto.auteursrechten) opties.push(`Auteursrechten: ${dto.auteursrechten}`);

  const opdrachtBlok = [
    mailDuo(['Type opdracht', dto.typeOpdracht], ['Datum', dto.datum]),
    slotBlok,
    extras.length ? mailFull('Extra diensten', extras.join(' · ')) : '',
    opties.length ? mailFull('Opties', opties.join(' · ')) : '',
    mailDuo(
      ['Adres opdracht', dto.adresOpdracht],
      ['Afstand', dto.afstandKm ? `${dto.afstandKm} km (enkele rit)` : undefined],
    ),
    mailFull('Opmerkingen', dto.opmerkingen),
  ].join('');

  let prijsBlok = '';
  if (dto.prijsRegels && dto.prijsRegels.length > 0) {
    const rijen = dto.prijsRegels
      .map(
        (r) => `<tr>
          <td style="padding:11px 18px 11px 0;font-size:13px;color:${INK};line-height:1.5;border-bottom:1px solid ${HAIR};">${esc(r.label)}</td>
          <td style="padding:11px 0;font-size:13px;color:${INK};text-align:right;white-space:nowrap;border-bottom:1px solid ${HAIR};">€ ${fmt(r.bedrag)}</td>
        </tr>`,
      )
      .join('');
    prijsBlok = `
      ${mailSectie('Prijsoverzicht')}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        ${rijen}
        <tr>
          <td style="padding:16px 18px 6px 0;font-size:13px;font-weight:700;color:${INK};">Totaal excl. BTW</td>
          <td style="padding:16px 0 6px;font-size:13px;font-weight:700;color:${GOLD};text-align:right;">€ ${fmt(dto.totaalExcl ?? 0)}</td>
        </tr>
        <tr>
          <td style="padding:4px 18px 4px 0;font-size:12.5px;color:${MUT};">BTW 21%</td>
          <td style="padding:4px 0;font-size:12.5px;color:${MUT};text-align:right;">€ ${fmt(dto.btw21 ?? 0)}</td>
        </tr>
        <tr>
          <td style="padding:10px 18px 0 0;font-size:16px;font-weight:700;color:${INK};">Totaal incl. BTW</td>
          <td style="padding:10px 0 0;font-size:16px;font-weight:700;color:${GOLD};text-align:right;">€ ${fmt(dto.totaalIncl ?? 0)}</td>
        </tr>
      </table>`;
  }

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(type)} — Class-Models</title></head>
<body style="margin:0;padding:0;background:#eceae6;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eceae6;padding:24px 16px;">
<tr><td align="center">
<table role="presentation" width="680" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;border-collapse:collapse;">

  <tr>
    <td style="background:${DARK};padding:16px 32px;border-bottom:2px solid ${GOLD};">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:600;letter-spacing:0.2em;color:${GOLD};text-transform:uppercase;">Class-Models</div>
      <div style="font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#9a917f;margin-top:4px;">Modeling Agency</div>
    </td>
  </tr>

  <tr>
    <td style="background:${PAPER};padding:24px 32px 8px;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;color:${INK};">${esc(type)}</div>
      <div style="font-size:12px;color:${MUT};margin-top:6px;line-height:1.5;">Ontvangen op ${esc(now)}</div>
    </td>
  </tr>

  <tr>
    <td style="background:${PAPER};padding:4px 32px 28px;">
      ${mailSectie('Uw gegevens')}
      ${klantBlok}
      ${mailSectie('Opdracht')}
      ${opdrachtBlok}
      ${prijsBlok}
      <p style="font-size:12px;color:${MUT};margin:24px 0 0;border-top:1px solid ${HAIR};padding-top:16px;line-height:1.6;">
        ${
          dto.isBestelling
            ? `Dit is een <strong style="color:${INK};">bevestigde bestelling</strong>. Class-Models neemt zo snel mogelijk contact met u op.`
            : `Dit is een <strong style="color:${INK};">vrijblijvende offerteaanvraag</strong>. Class-Models bezorgt u een definitieve offerte na bespreking.`
        }
      </p>
    </td>
  </tr>

  <tr>
    <td style="background:${DARK};padding:16px 32px;border-top:2px solid ${GOLD};">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:12px;letter-spacing:0.16em;color:${GOLD};text-transform:uppercase;">Class-Models</div>
      <div style="font-size:11px;line-height:1.75;color:#b5ac9c;margin-top:8px;">
        ${esc(CM.adres)} · <a href="mailto:${CM.email}" style="color:${GOLD};text-decoration:none;">${CM.email}</a> · ${esc(CM.telefoon)}<br/>
        BTW ${esc(CM.btw)} · IBAN ${esc(CM.iban)} · <a href="https://${CM.site}" style="color:${GOLD};text-decoration:none;">${CM.site}</a>
      </div>
    </td>
  </tr>

</table>
</td></tr></table>
</body></html>`;
}

// ─── Afstand (geocode + route, zelfde bronnen als agenda) ────────────────────

async function geocodeBe(query: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=be`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ClassModelsOfferte/1.0 (class-models.be)' },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{ lat: string; lon: string }>;
  const hit = rows[0];
  if (!hit) return null;
  const lat = parseFloat(hit.lat);
  const lon = parseFloat(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

async function drivingKm(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
): Promise<number | null> {
  const path = `${from.lon},${from.lat};${to.lon},${to.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${path}?overview=false`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) return null;
  const json = (await res.json()) as { routes?: Array<{ distance?: number }> };
  const m = json.routes?.[0]?.distance;
  if (!m || !Number.isFinite(m)) return null;
  return Math.round(m / 100) / 10;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller('portal/client/offerte')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PortalClientOfferteController {
  private readonly log = new Logger(PortalClientOfferteController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Permissions('portal.client.briefs.write')
  create(@Body() dto: CreateClientOfferteDto): { success: boolean } {
    if (!dto.clientEmail) {
      throw new BadRequestException('E-mailadres is verplicht.');
    }

    const subject = dto.isBestelling
      ? 'Class-Models — Bestelling'
      : 'Class-Models — Offerteaanvraag';
    const html = buildBrandedEmail(dto);

    // Mails op de achtergrond (SMTP kan traag zijn/retries doen → proxy-timeout vermijden).
    const targets = [dto.clientEmail, CM.email];
    if (dto.kopieEmail?.trim()) targets.push(dto.kopieEmail.trim());
    for (const to of targets) {
      void sendHtmlMail(this.prisma, to, subject, html).then((ok) => {
        if (!ok) this.log.error(`Offerte-mail niet verstuurd naar ${to}`);
      });
    }

    return { success: true };
  }

  /** Afstand kantoor → adres opdracht (enkele rit, km) voor de reiskostenberekening. */
  @Post('afstand')
  @Permissions('portal.client.briefs.write')
  async afstand(@Body() dto: AfstandDto): Promise<{ km: number; label: string }> {
    const from = { lat: CLASS_MODELS_OFFICE.lat, lon: CLASS_MODELS_OFFICE.lon };
    const to = await geocodeBe(dto.adres.trim());
    if (!to) {
      throw new BadRequestException(
        'Adres niet gevonden. Gebruik het formaat «Straat nr, gemeente».',
      );
    }
    const km = await drivingKm(from, to);
    if (km == null) {
      throw new BadRequestException('Afstand kon niet worden berekend. Probeer opnieuw.');
    }
    return { km, label: `${km} km enkele rit — reiskosten: ${km} × 2 × € 0,70` };
  }
}
