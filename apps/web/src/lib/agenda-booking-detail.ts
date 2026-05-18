/** Admin planning / boekingen: reserveringsdetail-validatie en veld-normalisatie. */

export const CANCELLED_AGENDA_STATUSES = new Set(['cancelled', 'cancelled_cm', 'geannuleerd']);

export function isCancelledAgendaStatus(status: string): boolean {
  return CANCELLED_AGENDA_STATUSES.has(status);
}

/** Geannuleerde boekingen verbergen in het rooster enkel voor deze agenda-slugs. */
export function planningHideCancelledBooking(calendarSlug: string, status: string): boolean {
  if (!isCancelledAgendaStatus(status)) return false;
  const s = calendarSlug.toLowerCase();
  return s === 'opleiding' || s === 'portfolio';
}

export function ageFromIsoBirthYmd(ymdRaw: string | null | undefined, ref = new Date()): number | null {
  const ymd = ymdRaw?.trim();
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, mo, da] = ymd.split('-').map((x) => parseInt(x, 10));
  if (!y || mo < 1 || mo > 12 || da < 1 || da > 31) return null;
  const bd = new Date(y, mo - 1, da);
  if (bd.getFullYear() !== y || bd.getMonth() !== mo - 1 || bd.getDate() !== da) return null;
  let age = ref.getFullYear() - y;
  const mDiff = ref.getMonth() - (mo - 1);
  if (mDiff < 0 || (mDiff === 0 && ref.getDate() < da)) age -= 1;
  return age;
}

/** Sleutels die we gestructureerd tonen (niet als vrije JSON-velden). */
export const RESERVED_FIELDS_JSON_KEYS = new Set([
  'foto',
  'bericht',
  'opmerkingen',
  'email',
  'e-mail',
  'mail',
  'naam',
  'name',
  'voornaam',
  'firstname',
  'familienaam',
  'lastname',
  'telefoon',
  'phone',
  'gsm',
  'adres',
  'address',
  'geboortedatum',
  'birthdate',
  'annulatie_reden',
  'annulatie_nieuwe_afspraak_gewenst',
  'ouder_met',
  'ouder_naam',
  'ouder_gsm',
]);

export function isReservedFieldsJsonKey(key: string): boolean {
  return RESERVED_FIELDS_JSON_KEYS.has(key.toLowerCase());
}

export function fjString(fj: Record<string, unknown>, key: string): string {
  const v = fj[key];
  if (v == null) return '';
  return String(v).trim();
}

/** Normaliseert opmerkingen en verwijdert legacy `bericht` bij opslag. */
export function prepareFieldsJsonForSave(fj: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fj)) {
    if (v == null) continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = String(v);
    }
  }
  const opm = (out.opmerkingen || out.bericht || '').trim();
  if (opm) {
    out.opmerkingen = opm;
    delete out.bericht;
  }
  return out;
}

export function opmerkingenDisplayValue(fj: Record<string, unknown>): string {
  const o = fjString(fj, 'opmerkingen');
  if (o) return o;
  return fjString(fj, 'bericht');
}

export function validateBookingDetailForSave(input: {
  name: string | null;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  fieldsJson: Record<string, unknown>;
}): string | null {
  const t = (s: string | null | undefined) => (typeof s === 'string' ? s.trim() : '');
  if (!t(input.name)) return 'Naam is verplicht.';
  if (!t(input.firstname)) return 'Voornaam is verplicht.';
  if (!t(input.lastname)) return 'Familienaam is verplicht.';
  const em = t(input.email);
  if (!em || !em.includes('@')) return 'E-mail is verplicht en moet een geldig adres bevatten.';
  if (!t(input.phone)) return 'GSM is verplicht.';
  const fj = input.fieldsJson;
  if (!fjString(fj, 'adres')) return 'Adres is verplicht.';
  const geb = fjString(fj, 'geboortedatum');
  if (!geb) return 'Geboortedatum is verplicht.';
  const age = ageFromIsoBirthYmd(geb);
  if (age == null) return 'Geboortedatum is ongeldig (gebruik JJJJ-MM-DD).';
  const opm = opmerkingenDisplayValue(fj);
  if (!opm) return 'Opmerkingen zijn verplicht.';
  if (isCancelledAgendaStatus(input.status)) {
    if (!fjString(fj, 'annulatie_reden')) return 'Reden van annulatie is verplicht wanneer de status geannuleerd is.';
  }
  if (age < 18) {
    const met = fjString(fj, 'ouder_met').toLowerCase();
    if (met !== 'vader' && met !== 'moeder') return 'Kies of u met vader of met moeder komt (minderjarig).';
    if (!fjString(fj, 'ouder_naam')) return 'Naam van de ouder is verplicht (minderjarig).';
    if (!fjString(fj, 'ouder_gsm')) return 'GSM van de ouder is verplicht (minderjarig).';
  }
  return null;
}
