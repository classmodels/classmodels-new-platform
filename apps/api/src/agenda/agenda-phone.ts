import { BadRequestException } from '@nestjs/common';

export function agendaPhoneDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Belgisch mobiel: exact 10 cijfers, geen spaties of tekens. */
export function assertAgendaMobile10Digits(raw: string | null | undefined, label = 'GSM'): void {
  const d = agendaPhoneDigits(raw ?? '');
  if (d.length !== 10) {
    throw new BadRequestException(
      `${label} moet exact 10 cijfers bevatten (bv. 0498720371), zonder spaties of tekens.`,
    );
  }
  if (!d.startsWith('0')) {
    throw new BadRequestException(`${label} moet met 0 beginnen (Belgisch nummer).`);
  }
}

export function formatBulksmsError(httpStatus: number, body: string): string {
  const lower = body.toLowerCase();
  if (httpStatus === 402 || lower.includes('credit') || lower.includes('balance') || lower.includes('insufficient')) {
    return 'Geen SMS-krediet op bulksms.com.';
  }
  if (httpStatus === 401 || httpStatus === 403) {
    return 'BulkSMS-inloggegevens ongeldig.';
  }
  if (httpStatus === 400 && (lower.includes('invalid') || lower.includes('number') || lower.includes('msisdn'))) {
    return 'Verkeerd telefoonnummer voor SMS.';
  }
  const snippet = body.replace(/\s+/g, ' ').trim().slice(0, 180);
  return snippet ? `BulkSMS-fout (${httpStatus}): ${snippet}` : `BulkSMS-fout (HTTP ${httpStatus}).`;
}
