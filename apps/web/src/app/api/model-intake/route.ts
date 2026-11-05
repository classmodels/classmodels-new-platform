import { randomUUID } from 'crypto';
import QRCode from 'qrcode';
import { buildClassModelsEmailDocument } from '@cm/shared';
import type { MeasureRow, ModelReport } from '@/lib/model-analyse';
import { runModelAnalysis } from '@/lib/model-analyse-run';
import {
  intakeImages,
  intakePhoto,
  listIntakes,
  mollieKey,
  readIntake,
  readSettings,
  saveIntake,
  saveLiveSettings,
  type IntakeRecord,
} from '@/lib/model-intake-store';

export const runtime = 'nodejs';

const PRICE = '4.99';
const PRICE_LABEL = '4,99';
const OFFICE_COPY = 'inschrijving@class-models.be';
const running = new Set<string>();

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'cache-control': 'no-store' } });
}

async function isAdmin(request: Request) {
  const token = request.headers.get('authorization') || '';
  if (!token.toLowerCase().startsWith('bearer ')) return false;
  const api = (process.env.NEXT_PUBLIC_API_URL || 'https://api.class-models.be').replace(/\/$/, '');
  const res = await fetch(`${api}/users/me`, { headers: { Authorization: token } });
  if (!res.ok) return false;
  const me = await res.json();
  const roles: string[] = Array.isArray(me?.roles) ? me.roles : [];
  const permissions: string[] = Array.isArray(me?.permissions) ? me.permissions : [];
  return roles.includes('admin') || permissions.some((item) => item.startsWith('admin.'));
}

async function qrDataUrl(text: string) {
  return QRCode.toDataURL(text, { margin: 1, width: 280, color: { dark: '#14120e', light: '#ffffff' } });
}

async function molliePost(key: string, body: Record<string, unknown>) {
  const created = await fetch('https://api.mollie.com/v2/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payment = await created.json();
  return { ok: created.ok, payment };
}

async function mollieCreate(record: IntakeRecord, origin: string) {
  const key = await mollieKey();
  if (!key) return null;
  const base = {
    amount: { currency: 'EUR', value: PRICE },
    description: `Class-Models modelanalyse € ${PRICE_LABEL} — ${record.firstName} ${record.lastName}`.slice(0, 255),
    redirectUrl: `${origin}/gasten/model-worden?intake=${record.id}#profiel`,
    locale: 'nl_BE',
    metadata: { intakeId: record.id, email: record.email },
  };
  let made = await molliePost(key, { ...base, method: 'bancontact' });
  if (!made.ok) made = await molliePost(key, base);
  if (!made.ok) return { error: made.payment?.detail || made.payment?.title || 'Mollie weigerde de betaling.' };
  const payment = made.payment;
  const details = await fetch(`https://api.mollie.com/v2/payments/${payment.id}?include=details.qrCode`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const full = await details.json();
  const checkout = payment?._links?.checkout?.href || full?._links?.checkout?.href || '';
  const qr = full?.details?.qrCode?.src || (checkout ? await qrDataUrl(checkout) : '');
  return { id: payment.id as string, checkout, qr };
}

async function mollieStatus(paymentId: string) {
  const key = await mollieKey();
  if (!key || !paymentId) return '';
  const res = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const payment = await res.json();
  return String(payment?.status || '');
}

function esc(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mailRule() {
  return '<div style="border-top:1px solid #e3d9c8;margin:26px 0 18px;line-height:0;font-size:0;">&nbsp;</div>';
}

function mailHeading(title: string) {
  return `<p style="margin:0 0 10px;color:#8a7340;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;letter-spacing:1.8px;text-transform:uppercase;">${esc(title)}</p>`;
}

function mailParagraph(text: string) {
  return `<p style="margin:0 0 12px;color:#262420;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:25px;">${esc(text)}</p>`;
}

function reportMail(record: IntakeRecord, report: ModelReport, origin: string) {
  const name = `${record.firstName} ${record.lastName}`.trim();
  const when = new Date().toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
  const score = report.overall === null ? 'voorlopig' : `${report.overall}%`;
  const book = `${origin.replace(/\/$/, '')}/gasten/model-worden#inschrijven`;
  const measures = report.measures
    .map(
      (row) => `<tr>
        <td style="padding:9px 0;border-bottom:1px solid #efe8dc;color:#262420;font-family:Arial,Helvetica,sans-serif;font-size:14px;">${esc(row.part)}</td>
        <td style="padding:9px 0;border-bottom:1px solid #efe8dc;color:#262420;font-family:Georgia,'Times New Roman',serif;font-size:15px;text-align:right;">${esc(row.value)} ${esc(row.unit)}</td>
      </tr>
      <tr><td colspan="2" style="padding:0 0 10px;color:#6f6a62;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;">${esc(row.meaning)}</td></tr>`,
    )
    .join('');
  const points = (items: ModelReport['strengths']) =>
    items
      .map(
        (item) => `<p style="margin:0 0 4px;color:#262420;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;"><strong>${esc(item.title)}</strong></p>
        <p style="margin:0 0 14px;color:#4a463f;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;">${esc(item.observation)} ${esc(item.meaning)}</p>`,
      )
      .join('');
  const directions = report.directions
    .map((item) => {
      const value = item.score === null ? 'nader te bepalen' : `${item.score}%`;
      const note = [item.qualification, item.why, item.limit, item.unknown].filter(Boolean).join(' ');
      return `<tr>
        <td style="padding:11px 0;border-bottom:1px solid #efe8dc;color:#262420;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;">${esc(item.label)}<br><span style="color:#6f6a62;font-size:12px;line-height:18px;">${esc(note)}</span></td>
        <td style="padding:11px 0 11px 12px;border-bottom:1px solid #efe8dc;color:#8a7340;font-family:Georgia,'Times New Roman',serif;font-size:18px;text-align:right;white-space:nowrap;vertical-align:top;">${esc(value)}</td>
      </tr>`;
    })
    .join('');

  const body = `
    <p style="margin:0 0 6px;color:#8a7340;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.8px;text-transform:uppercase;">Modelanalyse · dossier</p>
    <h1 style="margin:0 0 8px;color:#191919;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:36px;font-weight:normal;">Voorlopige bevindingen</h1>
    <p style="margin:0 0 18px;color:#6f6a62;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;">${esc(name)} · ${esc(when)}${record.heightCm ? ` · ${esc(String(record.heightCm))} cm` : ''}</p>
    ${mailParagraph(`Geachte ${name},`)}
    ${mailParagraph('De eerste resultaten van deze analyse zijn gunstig. De aangeleverde beelden laten een leesbaar morfologisch profiel zien dat in aanmerking komt voor een persoonlijke bespreking bij Class-Models.')}
    ${mailParagraph('Onderstaand dossier bundelt de proportionele lezing, de gelaatsmorfologie en de indicatie per opdrachtgebied. Het betreft een voorlopige, gestandaardiseerde beoordeling op basis van drie stilstaande opnamen. Tijdens uw afspraak worden deze bevindingen met u doorgenomen.')}
    ${report.summary ? mailParagraph(report.summary) : ''}
    ${mailRule()}
    ${mailHeading('Algemene profielindex')}
    <p style="margin:0;color:#8a7340;font-family:Georgia,'Times New Roman',serif;font-size:42px;line-height:46px;">${esc(score)}</p>
    <p style="margin:8px 0 0;color:#4a463f;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;">${esc(report.overallNote || 'Gemiddelde aansluiting over de beoordeelde opdrachtgebieden.')}</p>
    ${mailRule()}
    ${mailHeading('Antropometrische maten')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${measures}</table>
    ${mailRule()}
    ${mailHeading('Gunstige bevindingen')}
    ${points(report.strengths) || mailParagraph('De beelden ondersteunen een evenwichtige eerste indruk. De nuance wordt tijdens de afspraak verder geduid.')}
    ${mailRule()}
    ${mailHeading('Aandachtspunten')}
    ${points(report.weaker) || mailParagraph('Er zijn geen uitgesproken beperkingen vastgesteld die een gesprek in de weg staan.')}
    ${mailRule()}
    ${mailHeading('Indicatie per opdrachtgebied')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${directions}</table>
    ${report.forCandidate ? `${mailRule()}${mailHeading('Toelichting bij het dossier')}${mailParagraph(report.forCandidate)}` : ''}
    ${report.extra ? mailParagraph(report.extra) : ''}
    ${mailRule()}
    ${mailHeading('Vervolg en vergoeding')}
    ${mailParagraph(`Het voorschot voor deze analyse bedraagt € ${PRICE_LABEL}. Bij het nakomen van uw afspraak wordt dit bedrag terugbetaald tijdens uw afspraak bij Class-Models. Het voorschot vermijdt dat wij tijd vrijmaken en u niet komt opdagen.`)}
    ${mailParagraph('Class-Models heeft een kopie van deze mail ontvangen. Dit dossier wordt bij het maken en tijdens het verloop van uw afspraak besproken.')}
    <p style="margin:18px 0 0;">
      <a href="${esc(book)}" style="display:inline-block;background:#191919;color:#f7f4ed;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1.4px;text-transform:uppercase;text-decoration:none;padding:14px 22px;">Maak uw afspraak</a>
    </p>
  `;

  const text = [
    `Geachte ${name},`,
    '',
    'De eerste resultaten van deze analyse zijn gunstig.',
    report.summary,
    '',
    `Algemene profielindex: ${score}`,
    report.overallNote,
    '',
    'Antropometrische maten',
    ...report.measures.map((row) => `- ${row.part}: ${row.value} ${row.unit}. ${row.meaning}`),
    '',
    'Gunstige bevindingen',
    ...report.strengths.map((item) => `- ${item.title}: ${item.observation} ${item.meaning}`),
    '',
    'Aandachtspunten',
    ...report.weaker.map((item) => `- ${item.title}: ${item.observation} ${item.meaning}`),
    '',
    'Indicatie per opdrachtgebied',
    ...report.directions.map((item) => `- ${item.label}: ${item.score === null ? 'nader te bepalen' : `${item.score}%`} — ${item.qualification}`),
    '',
    report.forCandidate,
    report.extra,
    '',
    `Het voorschot bedraagt € ${PRICE_LABEL} en wordt terugbetaald wanneer u op uw afspraak aanwezig bent.`,
    'Class-Models heeft een kopie van deze mail ontvangen. Het dossier wordt bij uw afspraak besproken.',
    '',
    book,
    '',
    'Class-Models',
    'Provinciebaan 3, 2235 Hulshout',
    'info@class-models.be',
    '+32 485 32 23 07',
  ]
    .filter((line) => line !== undefined)
    .join('\n');

  return {
    html: buildClassModelsEmailDocument(body, { title: 'Uw modelanalyse bij Class-Models' }),
    text,
  };
}

async function sendReport(record: IntakeRecord, report: ModelReport, origin: string) {
  const settings = await readSettings();
  if (!settings.smtpHost || !settings.smtpFrom) return false;
  const nodemailer = await import('nodemailer');
  const transport = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort || 587,
    secure: settings.smtpPort === 465,
    auth: settings.smtpUser ? { user: settings.smtpUser, pass: settings.smtpPass } : undefined,
  });
  const mail = reportMail(record, report, origin);
  const subject = 'Uw modelanalyse bij Class-Models';
  await transport.sendMail({
    from: settings.smtpFrom,
    to: record.email,
    bcc: OFFICE_COPY,
    subject,
    text: mail.text,
    html: mail.html,
  });
  return true;
}

function originOf(request: Request) {
  return request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://www.class-models.be';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const photo = url.searchParams.get('photo');
  const slot = url.searchParams.get('slot');
  if (photo && slot) {
    if (!(await isAdmin(request))) return json({ error: 'Geen toegang.' }, 401);
    const file = await intakePhoto(photo, slot);
    if (!file) return json({ error: 'Foto niet gevonden.' }, 404);
    return new Response(new Uint8Array(file.buf), { headers: { 'content-type': file.mime, 'cache-control': 'private, no-store' } });
  }
  if (url.searchParams.get('admin') === '1') {
    if (!(await isAdmin(request))) return json({ error: 'Geen toegang.' }, 401);
    const settings = await readSettings();
    const rows = await listIntakes();
    return json({
      settings: {
        hasOpenai: Boolean(settings.openaiKey || process.env.CLASS_MODELS_AI_KEY || process.env.OPENAI_API_KEY),
        hasMollie: Boolean(await mollieKey()),
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpFrom: settings.smtpFrom,
        hasSmtpPass: Boolean(settings.smtpPass),
      },
      intakes: rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        gender: row.gender,
        ageGroup: row.ageGroup,
        heightCm: row.heightCm,
        paymentStatus: row.paymentStatus,
        emailSent: row.emailSent,
      })),
    });
  }
  const id = url.searchParams.get('id') || '';
  if (id.startsWith('tr_')) {
    const status = await mollieStatus(id);
    return json({ id, status: status || 'open' });
  }
  let record: IntakeRecord;
  try {
    record = await readIntake(id);
  } catch {
    return json({ error: 'Deze analyse is niet gevonden.' }, 404);
  }
  if (record.paymentId && record.paymentStatus !== 'paid') {
    const status = await mollieStatus(record.paymentId);
    if (status) record.paymentStatus = status;
    await saveIntake(record);
  }
  if (record.paymentStatus !== 'paid') {
    const qr = record.checkout ? await qrDataUrl(record.checkout) : '';
    return json({ id: record.id, status: record.paymentStatus || 'open', qr, checkout: record.checkout });
  }
  if (!record.report && !running.has(record.id)) {
    running.add(record.id);
    try {
      const images = await intakeImages(record.id);
      const report = await runModelAnalysis({
        ageGroup: record.ageGroup,
        gender: record.gender,
        heightCm: record.heightCm,
        childAge: record.childAge,
        images,
        measures: (Array.isArray(record.measures) ? record.measures : []) as MeasureRow[],
      });
      record.report = report;
      try {
        record.emailSent = await sendReport(record, report, originOf(request));
      } catch {
        record.emailSent = false;
      }
      await saveIntake(record);
    } catch (error) {
      running.delete(record.id);
      return json({ id: record.id, status: 'paid', error: error instanceof Error ? error.message : 'De analyse is niet gelukt.' }, 502);
    }
    running.delete(record.id);
  }
  if (!record.report) return json({ id: record.id, status: 'paid', pending: true });
  return json({ id: record.id, status: 'paid', report: record.report, emailSent: record.emailSent });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'De gegevens konden niet worden gelezen.' }, 400);
  }
  if (body.action === 'settings') {
    if (!(await isAdmin(request))) return json({ error: 'Geen toegang.' }, 401);
    try {
      await saveLiveSettings(request.headers.get('authorization') || '', {
        openaiKey: String(body.openaiKey || ''),
        mollieKey: String(body.mollieKey || ''),
        smtpHost: String(body.smtpHost || ''),
        smtpPort: Number(body.smtpPort) || 587,
        smtpUser: String(body.smtpUser || ''),
        smtpPass: String(body.smtpPass || ''),
        smtpFrom: String(body.smtpFrom || ''),
      });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Opslaan mislukt.' }, 502);
    }
    return json({ ok: true });
  }

  if (body.action === 'run') {
    const coupon = String(body.coupon || '').trim().toLowerCase();
    const staffFree = coupon === 'alain' && (await isAdmin(request));
    if (coupon && !staffFree) return json({ error: 'Die couponcode klopt niet.' }, 400);
    const paymentId = String(body.paymentId || '');
    if (!staffFree) {
      const status = await mollieStatus(paymentId);
      if (status !== 'paid') return json({ error: 'De betaling is nog niet gelukt.' }, 402);
    }
    const images = Array.isArray(body.images) ? body.images.filter((src) => typeof src === 'string' && src.startsWith('data:image/')) : [];
    if (images.length !== 3) return json({ error: 'De foto’s ontbreken.' }, 400);
    const record = {
      id: paymentId,
      createdAt: new Date().toISOString(),
      firstName: String(body.firstName || '').trim(),
      lastName: String(body.lastName || '').trim(),
      email: String(body.email || '').trim(),
      gender: String(body.gender || ''),
      ageGroup: body.ageGroup === 'child' ? 'child' as const : 'adult' as const,
      heightCm: body.heightCm == null ? null : Number(body.heightCm),
      childAge: body.childAge == null ? null : Number(body.childAge),
      paymentId,
      paymentStatus: 'paid',
      checkout: '',
      emailSent: false,
      measures: Array.isArray(body.measures) ? body.measures : [],
      report: null,
    };
    try {
      const report = await runModelAnalysis({
        ageGroup: record.ageGroup,
        gender: record.gender,
        heightCm: Number.isFinite(record.heightCm) ? record.heightCm : null,
        childAge: Number.isFinite(record.childAge) ? record.childAge : null,
        images,
        measures: record.measures as MeasureRow[],
      });
      try {
        record.emailSent = await sendReport(record, report, originOf(request));
      } catch {
        record.emailSent = false;
      }
      return json({ status: 'paid', report, emailSent: record.emailSent });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'De analyse is niet gelukt.' }, 502);
    }
  }

  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const gender = body.gender === 'women' || body.gender === 'men' ? body.gender : '';
  const ageGroup = body.ageGroup === 'child' ? 'child' : body.ageGroup === 'adult' ? 'adult' : '';
  const heightCm = body.heightCm == null || body.heightCm === '' ? null : Number(body.heightCm);
  const childAge = body.childAge == null || body.childAge === '' ? null : Number(body.childAge);
  const images = Array.isArray(body.images) ? body.images.filter((src) => typeof src === 'string' && src.startsWith('data:image/')) : [];
  if (!firstName || !lastName) return json({ error: 'Vul voornaam en naam in.' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Vul een geldig e-mailadres in.' }, 400);
  if (!gender || !ageGroup) return json({ error: 'Kies man of vrouw en de leeftijdsgroep.' }, 400);
  if (ageGroup === 'adult' && (!Number.isFinite(heightCm) || (heightCm as number) < 100 || (heightCm as number) > 240)) {
    return json({ error: 'Vul de lengte in, tussen 100 en 240 cm.' }, 400);
  }
  if (ageGroup === 'child' && (!Number.isFinite(childAge) || (childAge as number) < 1 || (childAge as number) > 17)) {
    return json({ error: 'Vul de leeftijd in jaren in.' }, 400);
  }
  if (images.length !== 3 || images.some((src) => src.length > 2_400_000)) {
    return json({ error: 'Drie foto’s zijn nodig.' }, 400);
  }

  if (!(await mollieKey())) {
    return json({ error: 'De betaling van € 4,99 is nog niet gekoppeld. Vul in de backsite de Mollie-sleutel in.' }, 503);
  }
  const record: IntakeRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    firstName,
    lastName,
    email,
    gender,
    ageGroup,
    heightCm: Number.isFinite(heightCm) ? heightCm : null,
    childAge: Number.isFinite(childAge) ? childAge : null,
    paymentId: '',
    paymentStatus: 'open',
    checkout: '',
    emailSent: false,
    measures: Array.isArray(body.measures) ? body.measures : [],
    report: null,
  };
  const payment = await mollieCreate(record, originOf(request));
  if (payment && 'error' in payment) return json({ error: payment.error }, 502);
  if (!payment) {
    return json({ error: 'De betaling van € 4,99 is nog niet gekoppeld. Vul in de backsite de Mollie-sleutel in.' }, 503);
  }
  return json({ id: payment.id, qr: payment.qr, checkout: payment.checkout, status: 'open', price: PRICE });
}
