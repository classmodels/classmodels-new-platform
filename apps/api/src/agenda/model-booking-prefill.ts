function str(v: unknown): string {
  if (v == null) return '';
  return typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '';
}

function digits(v: unknown): string {
  return str(v).replace(/\D/g, '');
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function expandTwoDigitYear(yy: number): number {
  return yy <= 29 ? 2000 + yy : 1900 + yy;
}

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

/**
 * Normaliseer geboortedatum naar JJJJ-MM-DD indien herkenbaar.
 * Aanvaardt 8 cijfers, dd/mm/jjjj, d/m/yyyy, yyyy-mm-dd, - . / en masker-underscores.
 * Houd gelijk met apps/web/src/lib/agenda-phone.ts
 */
export function normalizeIsoBirthDate(raw: string | null | undefined): string | null {
  const s = (raw ?? '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return null;

  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|[T\s])/.exec(s);
  if (m) return ymdIfRealBirth(+m[1], +m[2], +m[3]);

  m = /^(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{2}|\d{4})$/.exec(s);
  if (m) return ymdIfRealBirth(m[3].length === 2 ? expandTwoDigitYear(+m[3]) : +m[3], +m[2], +m[1]);

  const only = s.replace(/\D/g, '');
  if (only.length === 8) {
    const asDmy = ymdIfRealBirth(+only.slice(4, 8), +only.slice(2, 4), +only.slice(0, 2));
    if (asDmy) return asDmy;
    return ymdIfRealBirth(+only.slice(0, 4), +only.slice(4, 6), +only.slice(6, 8));
  }
  if (only.length === 6) {
    return ymdIfRealBirth(expandTwoDigitYear(+only.slice(4, 6)), +only.slice(2, 4), +only.slice(0, 2));
  }
  return null;
}

/** Vul boekingsvelden vanuit modellenaccount / modelSheet (portfolio, opleiding, …). */
export function bookingFieldsFromModelAccount(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  modelSheet: unknown;
}): Record<string, string> {
  const ms =
    user.modelSheet && typeof user.modelSheet === 'object' && !Array.isArray(user.modelSheet)
      ? (user.modelSheet as Record<string, unknown>)
      : null;
  const out: Record<string, string> = {};

  if (user.firstName) out.voornaam = user.firstName.trim();
  if (user.lastName) {
    out.familienaam = user.lastName.trim();
    out.achternaam = user.lastName.trim();
  }
  if (user.email) out.email = user.email.trim();
  const gsm = digits(ms?.gsmModel) || digits(user.phone);
  if (gsm) out.telefoon = gsm;

  if (!ms) return out;

  const straat = str(ms.straat);
  if (straat) out.straat = straat;
  const nr = str(ms.nr);
  if (nr) out.nr = nr;
  const postcode = str(ms.postcode);
  if (postcode) out.postcode = postcode;
  const gemeente = str(ms.gemeente);
  if (gemeente) out.gemeente = gemeente;
  const land = str(ms.land);
  if (land) out.land = land;
  const geb = normalizeIsoBirthDate(str(ms.geboortedatum));
  if (geb) out.geboortedatum = geb;

  const gsmMoeder = digits(ms.gsmMoeder);
  if (gsmMoeder) out.gsm_moeder = gsmMoeder;
  const gsmVader = digits(ms.gsmVader);
  if (gsmVader) out.gsm_vader = gsmVader;

  return out;
}
