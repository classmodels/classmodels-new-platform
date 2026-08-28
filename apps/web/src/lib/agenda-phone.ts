/** Client-side: Belgisch gsm → nationaal `0xxxxxxxxx` (zelfde logica als API). */
export function normalizeAgendaMobileNational(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let d = raw.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('32') && d.length >= 11) {
    d = `0${d.slice(2)}`;
  }
  d = d.replace(/\D/g, '');
  if (d.length === 10 && d.startsWith('0')) return d;
  if (d.length === 9 && d.startsWith('4')) return `0${d}`;
  return null;
}

export function agendaMobileError(raw: string | null | undefined, label = 'GSM'): string | null {
  if (!raw?.trim()) return `${label} is verplicht.`;
  if (!normalizeAgendaMobileNational(raw)) {
    return `${label} moet een Belgisch gsm-nummer zijn (bv. 0498720371 of +32 498 72 03 71).`;
  }
  return null;
}

const BIRTH_DATE_MASK = '__/__/____';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function expandTwoDigitYear(yy: number): number {
  return yy <= 29 ? 2000 + yy : 1900 + yy;
}

/** Echte kalenderdatum (geen 31/02), geboortejaar 1900 t.e.m. vandaag. */
function ymdIfRealBirth(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const now = new Date();
  if (year < 1900 || year > now.getFullYear()) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (dt > today) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function birthDateDigits(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\D/g, '').slice(0, 8);
}

export function isBirthDateFieldKey(fieldKey: string): boolean {
  const k = fieldKey.toLowerCase();
  return k === 'geboortedatum' || k === 'birthdate' || k === 'birth_date';
}

export function isBirthDateInputEmpty(raw: string | null | undefined): boolean {
  return birthDateDigits(raw).length === 0;
}

/** Masker `__/__/____` — cijfers vullen dag, maand, jaar. */
export function formatBirthDateMask(raw: string | null | undefined): string {
  const digits = birthDateDigits(raw);
  const chars = BIRTH_DATE_MASK.split('');
  let i = 0;
  for (let t = 0; t < chars.length && i < digits.length; t++) {
    if (chars[t] === '_') chars[t] = digits[i++];
  }
  return chars.join('');
}

export function dutchBirthDateFromIso(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Toon ISO of ruwe invoer als dd/mm/jjjj-masker. */
export function birthDateFieldDisplay(raw: string | null | undefined): string {
  const s = (raw ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const iso = normalizeIsoBirthDateClient(s);
    if (iso) return dutchBirthDateFromIso(iso);
  }
  return formatBirthDateMask(s);
}

/** Plakken van ISO of dd/mm/jjjj → masker; anders alleen cijfers in de slots. */
export function applyBirthDateMaskInput(raw: string): string {
  const t = (raw ?? '').trim();
  if (
    /^\d{4}-\d{2}-\d{2}/.test(t) ||
    /^\d{1,2}\s*[./-]\s*\d{1,2}\s*[./-]\s*\d{4}$/.test(t)
  ) {
    const iso = normalizeIsoBirthDateClient(t);
    if (iso) return dutchBirthDateFromIso(iso);
  }
  return formatBirthDateMask(raw);
}

/**
 * Normaliseer geboortedatum naar JJJJ-MM-DD.
 * Aanvaardt o.a. 8 cijfers, dd/mm/jjjj, d/m/yyyy, yyyy-mm-dd, - . / en masker-underscores.
 * Houd gelijk met apps/api/src/agenda/model-booking-prefill.ts
 */
export function normalizeIsoBirthDateClient(raw: string | null | undefined): string | null {
  const s = (raw ?? '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return null;

  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|[T\s])/.exec(s);
  if (m) return ymdIfRealBirth(+m[1], +m[2], +m[3]);

  m = /^(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{2}|\d{4})$/.exec(s);
  if (m) return ymdIfRealBirth(m[3].length === 2 ? expandTwoDigitYear(+m[3]) : +m[3], +m[2], +m[1]);

  const digits = s.replace(/\D/g, '');
  if (digits.length === 8) {
    const asDmy = ymdIfRealBirth(+digits.slice(4, 8), +digits.slice(2, 4), +digits.slice(0, 2));
    if (asDmy) return asDmy;
    return ymdIfRealBirth(+digits.slice(0, 4), +digits.slice(4, 6), +digits.slice(6, 8));
  }
  if (digits.length === 6) {
    return ymdIfRealBirth(
      expandTwoDigitYear(+digits.slice(4, 6)),
      +digits.slice(2, 4),
      +digits.slice(0, 2),
    );
  }
  return null;
}

/**
 * Bepaal het API-pad voor boekingen.
 * Voorkomt fouten als `Cannot POST /modellen?tab=portfolio` wanneer per ongeluk een site-URL werd doorgegeven.
 */
export function resolveAgendaBookPath(
  bookUrl: string | undefined,
  authToken?: string | null,
): string {
  const fallback = authToken ? '/portal/model/agenda/book-form' : '/agenda/book-form';
  const p = bookUrl?.trim();
  if (!p) return fallback;
  if (
    p.includes('?tab=') ||
    p.startsWith('/modellen') ||
    p.startsWith('/gasten') ||
    p.startsWith('/klanten') ||
    p.startsWith('/admin') ||
    !p.includes('book')
  ) {
    return fallback;
  }
  return p.startsWith('/') ? p : `/${p}`;
}

export function agendaFieldDisplayLabel(fieldKey: string, label: string): string {
  const k = fieldKey.toLowerCase();
  if (k === 'telefoon' || k === 'phone' || k === 'gsm') return 'GSM';
  if (k === 'nr' || k === 'huisnummer') return 'Nr. (huisnummer)';
  return label;
}

export function agendaFieldPlaceholder(fieldKey: string, placeholder?: string): string {
  const k = fieldKey.toLowerCase();
  if (k === 'telefoon' || k === 'phone' || k === 'gsm') return placeholder || '0498720371';
  if (k === 'nr' || k === 'huisnummer') return placeholder || 'Huisnr.';
  if (k === 'geboortedatum' || k === 'birthdate' || k === 'birth_date') return 'dd/mm/jjjj';
  return placeholder ?? '';
}
