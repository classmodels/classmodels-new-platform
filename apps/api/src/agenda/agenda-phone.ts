import { BadRequestException } from '@nestjs/common';

/** Alleen cijfers uit ruwe invoer. */
export function agendaPhoneDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

/**
 * Belgisch, Nederlands of Frans gsm → nationaal formaat `0xxxxxxxxx` (10 cijfers).
 * Accepteert o.a. `0498…`, `06…`, `07…`, `+32…`, `+31…`, `+33…`, `0032…` / `0031…` / `0033…`.
 */
export function normalizeAgendaMobileNational(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let d = raw.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('+')) d = d.slice(1);
  // Landcode 32 (BE), 31 (NL) of 33 (FR) → nationaal met leading 0
  if ((d.startsWith('32') || d.startsWith('31') || d.startsWith('33')) && d.length >= 11) {
    d = `0${d.slice(2)}`;
  }
  d = d.replace(/\D/g, '');
  if (d.length === 10 && d.startsWith('0')) return d;
  // Zonder leading 0: BE (4…), NL/FR (6…), FR (7…)
  if (d.length === 9 && (d.startsWith('4') || d.startsWith('6') || d.startsWith('7'))) return `0${d}`;
  return null;
}

/**
 * Belgisch, Nederlands of Frans gsm → E.164 (+32… / +31… / +33…) voor opslag en SMS.
 * Landcode uit de invoer blijft behouden; zonder landcode: 07→FR, 06→NL, anders BE.
 */
export function assertAgendaMobile10Digits(raw: string | null | undefined, label = 'GSM'): string {
  const national = normalizeAgendaMobileNational(raw);
  if (!national) {
    throw new BadRequestException(
      `${label} moet een Belgisch, Nederlands of Frans gsm-nummer zijn (bv. 0498720371, 0612345678, 0712345678, +32…, +31… of +33…).`,
    );
  }
  let d = String(raw || '')
    .replace(/\s+/g, '')
    .replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('+')) d = d.slice(1);
  const rest = national.slice(1);
  if (d.startsWith('33')) return `+33${rest}`;
  if (d.startsWith('31')) return `+31${rest}`;
  if (d.startsWith('32')) return `+32${rest}`;
  if (national.startsWith('07')) return `+33${rest}`;
  if (national.startsWith('06')) return `+31${rest}`;
  return `+32${rest}`;
}

export function formatBulksmsError(httpStatus: number, body: string): string {
  const lower = body.toLowerCase();
  if (httpStatus === 402 || lower.includes('credit') || lower.includes('balance') || lower.includes('insufficient')) {
    return 'Geen SMS-krediet op bulksms.com.';
  }
  if (httpStatus === 401 || httpStatus === 403) {
    return 'BulkSMS-inloggegevens ongeldig.';
  }
  /**
   * Alleen "verkeerd nummer" melden als BulkSMS écht over de bestemming klaagt.
   * Vroeger matchte elk foutbericht met het woord "number" (bv. "number of parts"),
   * waardoor correcte nummers onterecht als fout werden gemeld.
   */
  const mentionsRecipient =
    lower.includes('msisdn') ||
    lower.includes('recipient') ||
    lower.includes('destination') ||
    lower.includes('phone number') ||
    lower.includes('invalid number') ||
    (lower.includes('invalid') && lower.includes('to.address'));
  if (httpStatus === 400 && mentionsRecipient) {
    return 'Verkeerd telefoonnummer voor SMS.';
  }
  const snippet = body.replace(/\s+/g, ' ').trim().slice(0, 180);
  return snippet ? `BulkSMS-fout (${httpStatus}): ${snippet}` : `BulkSMS-fout (HTTP ${httpStatus}).`;
}
