import { BadRequestException } from '@nestjs/common';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function digitsOnlyPhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function assertValidEmail(email: string | null | undefined): void {
  const e = (email ?? '').trim();
  if (!e || !EMAIL_RE.test(e)) {
    throw new BadRequestException('Vul een geldig e-mailadres in.');
  }
}

export function assertModelPersonalDataComplete(input: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  modelSheet: Record<string, unknown> | null;
}): void {
  const fn = (input.firstName ?? '').trim();
  const ln = (input.lastName ?? '').trim();
  if (!fn) throw new BadRequestException('Voornaam is verplicht.');
  if (!ln) throw new BadRequestException('Familienaam is verplicht.');
  assertValidEmail(input.email);

  const ms = input.modelSheet ?? {};
  const geboorte = String(ms.geboortedatum ?? '').trim();
  if (!geboorte) throw new BadRequestException('Geboortedatum is verplicht.');

  const straat = String(ms.straat ?? '').trim();
  if (!straat) throw new BadRequestException('Straat en nr is verplicht.');

  const postcode = String(ms.postcode ?? '').trim();
  if (!postcode) throw new BadRequestException('Postcode is verplicht.');

  const gemeente = String(ms.gemeente ?? '').trim();
  if (!gemeente) throw new BadRequestException('Gemeente is verplicht.');

  const land = String(ms.land ?? '').trim();
  if (!land) throw new BadRequestException('Land is verplicht.');

  const gsm = String(ms.gsmModel ?? input.phone ?? '').trim();
  if (!gsm) throw new BadRequestException('GSM model is verplicht.');
  const digits = digitsOnlyPhone(gsm);
  if (!digits || digits.length < 8) {
    throw new BadRequestException('GSM model mag alleen cijfers bevatten (minstens 8).');
  }
}
