/** Interne kopie van model-worden inschrijvingen en annulaties. Geen aanspreking. */

export const MODEL_WORDEN_OFFICE_EMAIL = 'inschrijving@class-models.be';

export function isModelWordenOfficeCalendar(slug: string): boolean {
  return slug === 'model-worden' || slug === 'gratis-fotoshoot' || slug === 'intake-gesprek';
}

export type OfficeMailKind = 'created' | 'cancelled';

type OfficeMailInput = {
  kind: OfficeMailKind;
  packageLabel: string;
  appointmentLabel: string;
  timeLabel: string;
  registeredAtLabel: string;
  cancelledAtLabel: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  number: string;
  postcode: string;
  city: string;
  birthYear: string;
  student: boolean;
  livesAtHome: boolean;
  minor: boolean;
  parentName: string;
  parentPhone: string;
  cancelReason: string;
  wantsNewAppointment: boolean;
};

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function row(label: string, value: string): string {
  const shown = value.trim() || '—';
  return `<tr>
    <td style="padding:7px 12px 7px 0;width:168px;vertical-align:top;color:#6b6560;font-size:13px;line-height:1.4;">${esc(label)}</td>
    <td style="padding:7px 0;vertical-align:top;color:#1a1612;font-size:14px;line-height:1.4;font-weight:600;">${esc(shown)}</td>
  </tr>`;
}

function block(title: string, rows: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-top:1px solid #e4dfd6;margin:0;">
    <tr><td colspan="2" style="padding:14px 0 4px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8a7350;font-weight:700;">${esc(title)}</td></tr>
    ${rows}
  </table>`;
}

export function buildModelWordenOfficeMail(input: OfficeMailInput): { subject: string; html: string } {
  const who = [input.firstName, input.lastName].filter(Boolean).join(' ').trim() || 'Onbekend';
  const verb = input.kind === 'cancelled' ? 'Annulatie' : 'Inschrijving';
  const subject = `${verb} — ${who} — ${input.packageLabel} — ${input.appointmentLabel}`;

  const situation = [
    input.minor ? 'Minderjarig' : '',
    input.student ? 'Student' : '',
    input.livesAtHome ? 'Thuiswonend' : '',
  ]
    .filter(Boolean)
    .join(', ');

  const parts = [
    block(
      'Afspraak',
      [
        row('Type', input.packageLabel),
        row('Datum afspraak', input.appointmentLabel),
        row('Uur', input.timeLabel),
        row('Datum inschrijving', input.registeredAtLabel),
      ].join(''),
    ),
    block(
      'Persoon',
      [
        row('Naam', input.lastName),
        row('Voornaam', input.firstName),
        row('E-mail', input.email),
        row('Gsm', input.phone),
        row('Geboortejaar', input.birthYear),
      ].join(''),
    ),
    block(
      'Adres',
      [
        row('Straat', input.street),
        row('Nr', input.number),
        row('Postcode', input.postcode),
        row('Gemeente', input.city),
      ].join(''),
    ),
    block(
      'Situatie',
      [
        row('Aangeduid', situation),
        row('Naam ouder', input.parentName),
        row('Telefoon ouder', input.parentPhone),
      ].join(''),
    ),
  ];

  if (input.kind === 'cancelled') {
    parts.push(
      block(
        'Annulatie',
        [
          row('Datum annulatie', input.cancelledAtLabel ?? ''),
          row('Reden', input.cancelReason),
          row('Nieuwe afspraak gewenst', input.wantsNewAppointment ? 'Ja' : 'Nee'),
        ].join(''),
      ),
    );
  }

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1612;">
    <p style="margin:0 0 12px;font-size:16px;font-weight:700;">${esc(verb)}</p>
    ${parts.join('')}
  </div>`;

  return { subject, html };
}

export function yn(raw: unknown): boolean {
  const v = String(raw ?? '').trim().toLowerCase();
  return v === 'ja' || v === 'yes' || v === '1' || v === 'true';
}
