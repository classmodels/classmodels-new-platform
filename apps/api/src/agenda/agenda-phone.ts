import { BadRequestException } from '@nestjs/common';

/** Alleen cijfers uit ruwe invoer. */
export function agendaPhoneDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

/**
 * Belgisch mobiel → nationaal formaat `0xxxxxxxxx` (10 cijfers).
 * Accepteert o.a. `0498…`, `+32498…`, `0032498…`, `32498…`, spaties/streepjes.
 */
export function normalizeAgendaMobileNational(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let d = raw.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('+')) d = d.slice(1);
  // Landcode 32 → nationaal met leading 0
  if (d.startsWith('32') && d.length >= 11) {
    d = `0${d.slice(2)}`;
  }
  d = d.replace(/\D/g, '');
  if (d.length === 10 && d.startsWith('0')) return d;
  // Soms zonder leading 0 (9 cijfers, begint met 4…)
  if (d.length === 9 && d.startsWith('4')) return `0${d}`;
  return null;
}

/** Belgisch mobiel: exact 10 cijfers nationaal (bv. 0498720371). */
export function assertAgendaMobile10Digits(raw: string | null | undefined, label = 'GSM'): string {
  const normalized = normalizeAgendaMobileNational(raw);
  if (!normalized) {
    throw new BadRequestException(
      `${label} moet een Belgisch gsm-nummer zijn (bv. 0498720371 of +32 498 72 03 71).`,
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
