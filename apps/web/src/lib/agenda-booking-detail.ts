/** Admin planning / boekingen: reserveringsdetail-validatie en veld-normalisatie. */

export const CANCELLED_AGENDA_STATUSES = new Set(['cancelled', 'cancelled_cm', 'geannuleerd']);

export function isCancelledAgendaStatus(status: string): boolean {
  return CANCELLED_AGENDA_STATUSES.has(status);
}

/** Geannuleerde boekingen altijd tonen in planning (donkerrood met witte tekst). */
export function planningHideCancelledBooking(_calendarSlug: string, _status: string): boolean {
  return false;
}

/** Afspraak is voorbij (eindtijd ligt in het verleden). */
export function isAgendaBookingPast(row: { endAt: string }): boolean {
  const t = Date.parse(row.endAt);
  return Number.isFinite(t) && t < Date.now();
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
  'straat',
  'nr',
  'postcode',
  'gemeente',
  'geboortedatum',
  'birthdate',
  'annulatie_reden',
  'annulatie_nieuwe_afspraak_gewenst',
  'ouder_met',
  'ouder_naam',
  'ouder_gsm',
  'ouder_naam_vader',
  'ouder_gsm_vader',
  'ouder_naam_moeder',
  'ouder_gsm_moeder',
  'gsm_moeder',
  'gsm_vader',
  'land',
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

export function validateBookingDetailForSave(
  input: {
    name: string | null;
    firstname: string | null;
    lastname: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    fieldsJson: Record<string, unknown>;
  },
  opts?: { adminLoose?: boolean },
): string | null {
  if (opts?.adminLoose) {
    return null;
  }
  const t = (s: string | null | undefined) => (typeof s === 'string' ? s.trim() : '');
  if (!t(input.name)) return 'Naam is verplicht.';
  if (!t(input.firstname)) return 'Voornaam is verplicht.';
  if (!t(input.lastname)) return 'Familienaam is verplicht.';
  const em = t(input.email);
  if (!em || !em.includes('@')) return 'E-mail is verplicht en moet een geldig adres bevatten.';
  if (!t(input.phone)) return 'GSM is verplicht.';
  const phoneDigits = t(input.phone).replace(/\D/g, '');
  if (phoneDigits.length !== 10) {
    return 'GSM moet exact 10 cijfers bevatten (bv. 0498720371), zonder spaties of tekens.';
  }
  const fj = input.fieldsJson;
  if (!fjString(fj, 'straat')) return 'Straat is verplicht.';
  if (!fjString(fj, 'nr')) return 'Nr is verplicht.';
  if (!fjString(fj, 'postcode')) return 'Postcode is verplicht.';
  if (!fjString(fj, 'gemeente')) return 'Gemeente is verplicht.';
  const geb = fjString(fj, 'geboortedatum');
  if (!geb) return 'Geboortedatum is verplicht.';
  const age = ageFromIsoBirthYmd(geb);
  if (age == null) return 'Geboortedatum is ongeldig (gebruik JJJJ-MM-DD).';
  if (isCancelledAgendaStatus(input.status)) {
    if (!fjString(fj, 'annulatie_reden')) return 'Reden van annulatie is verplicht wanneer de status geannuleerd is.';
  }
  if (age < 18) {
    const met = fjString(fj, 'ouder_met').toLowerCase();
    if (met !== 'vader' && met !== 'moeder' && met !== 'allebei_ouders') {
      return 'Kies met wie u komt: vader, moeder of allebei ouders (minderjarig).';
    }
    if (met === 'allebei_ouders') {
      if (!fjString(fj, 'ouder_naam_vader')) return 'Naam van de vader is verplicht (minderjarig).';
      if (!fjString(fj, 'ouder_gsm_vader')) return 'GSM van de vader is verplicht (minderjarig).';
      if (!fjString(fj, 'ouder_naam_moeder')) return 'Naam van de moeder is verplicht (minderjarig).';
      if (!fjString(fj, 'ouder_gsm_moeder')) return 'GSM van de moeder is verplicht (minderjarig).';
    } else {
      if (!fjString(fj, 'ouder_naam')) return 'Naam van de ouder is verplicht (minderjarig).';
      if (!fjString(fj, 'ouder_gsm')) return 'GSM van de ouder is verplicht (minderjarig).';
    }
  }
  return null;
}

export type AdminBookingDetailSnapshot = {
  status: string;
  name: string | null;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  phone: string | null;
  fieldsJson: Record<string, string>;
  schedCalId: string;
  schedYmd: string;
  schedStart: string;
  schedEnd: string;
};

export function adminBookingDetailSnapshot(input: {
  status: string;
  name: string | null;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  phone: string | null;
  fieldsJson: Record<string, unknown>;
  schedCalId: string;
  schedYmd: string;
  schedStart: string;
  schedEnd: string;
}): AdminBookingDetailSnapshot {
  return {
    status: input.status,
    name: input.name,
    firstname: input.firstname,
    lastname: input.lastname,
    email: input.email,
    phone: input.phone?.replace(/\D/g, '') ?? input.phone,
    fieldsJson: prepareFieldsJsonForSave(input.fieldsJson),
    schedCalId: input.schedCalId,
    schedYmd: input.schedYmd,
    schedStart: input.schedStart,
    schedEnd: input.schedEnd,
  };
}

function normStr(v: string | null | undefined): string {
  return (v ?? '').trim();
}

function fieldsJsonEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if ((a[k] ?? '').trim() !== (b[k] ?? '').trim()) return false;
  }
  return true;
}

export function adminBookingDetailHasChanges(
  current: AdminBookingDetailSnapshot,
  initial: AdminBookingDetailSnapshot,
): boolean {
  if (current.status !== initial.status) return true;
  if (normStr(current.name) !== normStr(initial.name)) return true;
  if (normStr(current.firstname) !== normStr(initial.firstname)) return true;
  if (normStr(current.lastname) !== normStr(initial.lastname)) return true;
  if (normStr(current.email) !== normStr(initial.email)) return true;
  if (normStr(current.phone) !== normStr(initial.phone)) return true;
  if (current.schedCalId !== initial.schedCalId) return true;
  if (current.schedYmd !== initial.schedYmd) return true;
  if (current.schedStart !== initial.schedStart) return true;
  if (current.schedEnd !== initial.schedEnd) return true;
  if (!fieldsJsonEqual(current.fieldsJson, initial.fieldsJson)) return true;
  return false;
}

/** Admin: vraag e-mail/SMS bij annulatie of andere wijziging. */
export function promptAdminBookingSaveNotifications(opts: {
  becomingCancelled: boolean;
  hasOtherChanges: boolean;
}): {
  notifyCancelEmail: boolean;
  notifyCancelSms: boolean;
  notifyUpdateEmail: boolean;
  notifyUpdateSms: boolean;
} {
  const out = {
    notifyCancelEmail: false,
    notifyCancelSms: false,
    notifyUpdateEmail: false,
    notifyUpdateSms: false,
  };
  if (opts.becomingCancelled) {
    out.notifyCancelEmail = window.confirm(
      'Wilt u een e-mail sturen naar het model/bezoeker dat Class-Models de afspraak heeft geannuleerd?',
    );
    out.notifyCancelSms = window.confirm('Wilt u ook een SMS sturen met deze melding?');
    return out;
  }
  if (opts.hasOtherChanges) {
    out.notifyUpdateEmail = window.confirm(
      'Wilt u de aanpassing per e-mail sturen naar het model/bezoeker?',
    );
    out.notifyUpdateSms = window.confirm('Wilt u de aanpassing ook per SMS sturen?');
  }
  return out;
}
