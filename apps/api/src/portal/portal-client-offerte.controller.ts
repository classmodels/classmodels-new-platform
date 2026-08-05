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

const GOLD = '#c8a662';
const DARK = '#121110';
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

/** Sectiekop in de mail (goud, kapitalen). */
function mailSectie(titel: string): string {
  return `<tr><td colspan="2" style="padding:22px 0 8px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${GOLD};border-bottom:1px solid ${HAIR};">${titel}</td></tr>`;
}

function mailRij(label: string, val: string | undefined | null): string {
  if (!val) return '';
  return `<tr>
    <td style="padding:7px 14px 7px 0;font-size:12.5px;color:${MUT};white-space:nowrap;vertical-align:top;border-bottom:1px solid ${HAIR};">${esc(label)}</td>
    <td style="padding:7px 0;font-size:12.5px;color:${INK};border-bottom:1px solid ${HAIR};">${esc(val)}</td>
  </tr>`;
}

function buildBrandedEmail(dto: CreateClientOfferteDto): string {
  const type = dto.isBestelling ? 'Bestelling' : 'Offerteaanvraag';
  const now = new Intl.DateTimeFormat('nl-BE', { dateStyle: 'long', timeStyle: 'short' }).format(
    new Date(),
  );

  const klantRijen = [
    mailRij('Naam', dto.naam),
    mailRij('Bedrijfsnaam', dto.bedrijfsnaam),
    mailRij('Soort bedrijf', dto.soortBedrijf),
    mailRij('BTW-nummer', dto.btw),
    mailRij('Adres', [dto.straat, dto.nr].filter(Boolean).join(' ')),
    mailRij('Postcode & gemeente', [dto.postcode, dto.gemeente].filter(Boolean).join(' ')),
    mailRij('GSM', dto.gsm),
    mailRij('E-mail', dto.clientEmail),
    mailRij('Website', dto.website),
  ].join('');

  const slotRijen = (dto.slots ?? [])
    .filter((s) => (s.aantal ?? 0) > 0)
    .map((s, i) => mailRij(`Groep ${i + 1}`, slotZin(s, i).replace(`Groep ${i + 1}: `, '')))
    .join('');

  const e = dto.extraDiensten;
  const opdrachtRijen = [
    mailRij('Type opdracht', dto.typeOpdracht),
    mailRij('Datum', dto.datum),
    slotRijen,
    e?.visagiste ? mailRij('Visagiste', `${e.visagiste} uur`) : '',
    e?.hairstyliste ? mailRij('Hairstyliste', `${e.hairstyliste} uur`) : '',
    e?.fotograaf ? mailRij('Fotograaf', `${e.fotograaf} uur`) : '',
    e?.medewerker ? mailRij('Medewerk(st)er', `${e.medewerker} uur`) : '',
    dto.doorpassen ? mailRij('Doorpassen', 'Ja (+ € 50 forfait)') : '',
    dto.lingerie ? mailRij('Lingerie / badmode', 'Ja (+50% toeslag)') : '',
    mailRij('Auteursrechten', dto.auteursrechten || undefined),
    mailRij('Adres opdracht', dto.adresOpdracht),
    dto.afstandKm ? mailRij('Afstand', `${dto.afstandKm} km (enkele rit)`) : '',
    mailRij('Opmerkingen', dto.opmerkingen),
  ].join('');

  let prijsBlok = '';
  if (dto.prijsRegels && dto.prijsRegels.length > 0) {
    const rijen = dto.prijsRegels
      .map(
        (r) => `<tr>
          <td style="padding:7px 14px 7px 0;font-size:12.5px;color:${INK};border-bottom:1px solid ${HAIR};">${esc(r.label)}</td>
          <td style="padding:7px 0;font-size:12.5px;color:${INK};text-align:right;white-space:nowrap;border-bottom:1px solid ${HAIR};">€ ${fmt(r.bedrag)}</td>
        </tr>`,
      )
      .join('');
    prijsBlok = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:4px;">
        ${mailSectie('Prijsoverzicht')}
        ${rijen}
        <tr>
          <td style="padding:10px 14px 4px 0;font-size:13px;font-weight:700;color:${INK};">Totaal excl. BTW</td>
          <td style="padding:10px 0 4px;font-size:13px;font-weight:700;color:${GOLD};text-align:right;">€ ${fmt(dto.totaalExcl ?? 0)}</td>
        </tr>
        <tr>
          <td style="padding:2px 14px 2px 0;font-size:12px;color:${MUT};">BTW 21%</td>
          <td style="padding:2px 0;font-size:12px;color:${MUT};text-align:right;">€ ${fmt(dto.btw21 ?? 0)}</td>
        </tr>
        <tr>
          <td style="padding:4px 14px 0 0;font-size:15px;font-weight:700;color:${INK};">Totaal incl. BTW</td>
          <td style="padding:4px 0 0;font-size:15px;font-weight:700;color:${GOLD};text-align:right;">€ ${fmt(dto.totaalIncl ?? 0)}</td>
        </tr>
      </table>`;
  }

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(type)} — Class-Models</title></head>
<body style="margin:0;padding:0;background:#eceae6;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eceae6;padding:28px 16px;">
<tr><td align="center">
<table role="presentation" width="680" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;border-collapse:collapse;">

  <!-- Header: logo -->
  <tr>
    <td style="background:${DARK};padding:26px 36px;border-bottom:2px solid ${GOLD};">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;letter-spacing:0.22em;color:${GOLD};text-transform:uppercase;">Class-Models</div>
      <div style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#9a917f;margin-top:5px;">Modeling Agency</div>
    </td>
  </tr>

  <!-- Titel -->
  <tr>
    <td style="background:${PAPER};padding:30px 36px 0;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:21px;color:${INK};">${esc(type)}</div>
      <div style="font-size:12px;color:${MUT};margin-top:4px;">Ontvangen op ${esc(now)}</div>
    </td>
  </tr>

  <!-- Inhoud -->
  <tr>
    <td style="background:${PAPER};padding:6px 36px 30px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        ${mailSectie('Uw gegevens')}
        ${klantRijen}
        ${mailSectie('Opdracht')}
        ${opdrachtRijen}
      </table>
      ${prijsBlok}
      <p style="font-size:12px;color:${MUT};margin:26px 0 0;border-top:1px solid ${HAIR};padding-top:16px;">
        ${
          dto.isBestelling
            ? `Dit is een <strong style="color:${INK};">bevestigde bestelling</strong>. Class-Models neemt zo snel mogelijk contact met u op voor de verdere opvolging.`
            : `Dit is een <strong style="color:${INK};">vrijblijvende offerteaanvraag</strong>. Class-Models bezorgt u een definitieve offerte na bespreking.`
        }
      </p>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:${DARK};padding:22px 36px;border-top:2px solid ${GOLD};">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:0.18em;color:${GOLD};text-transform:uppercase;">Class-Models</div>
      <div style="font-size:11px;line-height:1.8;color:#b5ac9c;margin-top:8px;">
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
