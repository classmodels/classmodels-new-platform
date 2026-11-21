import { BadRequestException } from '@nestjs/common';

/** Alleen cijfers uit ruwe invoer. */
export function agendaPhoneDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

/**
 * Belgisch of Nederlands mobiel → nationaal formaat `0xxxxxxxxx` (10 cijfers).
 * Accepteert o.a. `0498…`, `+32498…`, `06…`, `+316…`, `0031…` / `0032…`.
 */
export function normalizeAgendaMobileNational(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let d = raw.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('+')) d = d.slice(1);
  // Landcode 32 (BE) of 31 (NL) → nationaal met leading 0
  if ((d.startsWith('32') || d.startsWith('31')) && d.length >= 11) {
    d = `0${d.slice(2)}`;
  }
  d = d.replace(/\D/g, '');
  if (d.length === 10 && d.startsWith('0')) return d;
  // Zonder leading 0: BE (4…) of NL (6…)
  if (d.length === 9 && (d.startsWith('4') || d.startsWith('6'))) return `0${d}`;
  return null;
}

/** Belgisch of Nederlands mobiel: exact 10 cijfers nationaal (bv. 0498720371 of 0612345678). */
export function assertAgendaMobile10Digits(raw: string | null | undefined, label = 'GSM'): string {
  const normalized = normalizeAgendaMobileNational(raw);
  if (!normalized) {
    throw new BadRequestException(
      `${label} moet een Belgisch of Nederlands gsm-nummer zijn (bv. 0498720371, 0612345678, +32… of +31…).`,
    );
  }
  return normalized;
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
