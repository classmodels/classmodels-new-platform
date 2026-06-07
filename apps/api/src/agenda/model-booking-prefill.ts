function str(v: unknown): string {
  if (v == null) return '';
  return typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '';
}

function digits(v: unknown): string {
  return str(v).replace(/\D/g, '');
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
  const geb = str(ms.geboortedatum);
  if (geb) out.geboortedatum = geb.slice(0, 10);

  const gsmMoeder = digits(ms.gsmMoeder);
  if (gsmMoeder) out.gsm_moeder = gsmMoeder;
  const gsmVader = digits(ms.gsmVader);
  if (gsmVader) out.gsm_vader = gsmVader;

  return out;
}
