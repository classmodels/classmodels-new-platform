import QRCode from 'qrcode';
import type { MeasureRow, ModelReport } from '@/lib/model-analyse';
import { runModelAnalysis } from '@/lib/model-analyse-run';
import {
  createIntake,
  intakeImages,
  intakePhoto,
  listIntakes,
  mollieKey,
  readIntake,
  modelIntakeApiBases,
  readSettings,
  saveIntake,
  type IntakeRecord,
} from '@/lib/model-intake-store';

export const runtime = 'nodejs';

const PRICE = '3.99';
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

async function mollieCreate(record: IntakeRecord, origin: string) {
  const key = await mollieKey();
  if (!key) return null;
  const created = await fetch('https://api.mollie.com/v2/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: { currency: 'EUR', value: PRICE },
      description: `Class-Models modelanalyse — ${record.firstName} ${record.lastName}`,
      redirectUrl: `${origin}/gasten/model-worden?intake=${record.id}#profiel`,
      metadata: { intakeId: record.id, email: record.email },
    }),
  });
  const payment = await created.json();
  if (!created.ok) return { error: payment?.detail || payment?.title || 'Mollie weigerde de betaling.' };
  let qr = '';
  const details = await fetch(`https://api.mollie.com/v2/payments/${payment.id}?include=details.qrCode`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const full = await details.json();
  qr = full?.details?.qrCode?.src || '';
  const checkout = payment?._links?.checkout?.href || '';
  if (!qr && checkout) qr = await qrDataUrl(checkout);
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

function mailText(record: IntakeRecord, report: ModelReport, origin: string) {
  const lines = [
    `Dag ${record.firstName} ${record.lastName},`,
    '',
    'Je uitgebreide modelanalyse bij Class-Models staat klaar.',
    '',
    report.summary,
    '',
    `Algemene profielmatch: ${report.overall === null ? 'nog niet vast te stellen' : `${report.overall}%`}`,
    '',
    'Sterke punten',
    ...report.strengths.map((item) => `- ${item.title}: ${item.observation} ${item.meaning}`),
    '',
    'Minder sterke punten',
    ...report.weaker.map((item) => `- ${item.title}: ${item.observation} ${item.meaning}`),
    '',
    'Waarvoor je geschikt bent',
    ...report.directions.map((item) => `- ${item.label}: ${item.score === null ? 'aanvullende beoordeling nodig' : `${item.score}%`} — ${item.qualification}`),
    '',
    'Maten',
    ...report.measures.map((row) => `- ${row.part}: ${row.value} ${row.unit} (${row.status})`),
    '',
    report.forCandidate,
    '',
    `Maak hier direct een afspraak: ${origin}/gasten/model-worden#inschrijven`,
    '',
    'Class-Models',
    'Provinciebaan 3, 2235 Hulshout',
  ];
  return lines.join('\n');
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
  await transport.sendMail({
    from: settings.smtpFrom,
    to: record.email,
    subject: 'Je modelanalyse bij Class-Models',
    text: mailText(record, report, origin),
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
    const token = request.headers.get('authorization') || '';
    let message = 'Opslaan mislukt.';
    for (const api of modelIntakeApiBases()) {
      try {
        const res = await fetch(`${api}/admin/model-intake-settings`, {
          method: 'PATCH',
          headers: { Authorization: token, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            openaiKey: String(body.openaiKey || ''),
            mollieKey: String(body.mollieKey || ''),
            smtpHost: String(body.smtpHost || ''),
            smtpPort: Number(body.smtpPort) || 587,
            smtpUser: String(body.smtpUser || ''),
            smtpPass: String(body.smtpPass || ''),
            smtpFrom: String(body.smtpFrom || ''),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) return json({ ok: true });
        message = data.message || data.error || message;
        if (res.status !== 404) return json({ error: message }, res.status);
      } catch {
        message = 'De server voor de sleutel antwoordt niet.';
      }
    }
    return json({ error: message }, 502);
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

  const record = await createIntake(
    {
      firstName,
      lastName,
      email,
      gender,
      ageGroup,
      heightCm: Number.isFinite(heightCm) ? heightCm : null,
      childAge: Number.isFinite(childAge) ? childAge : null,
    },
    images,
  );
  record.measures = Array.isArray(body.measures) ? body.measures : [];
  await saveIntake(record);
  const payment = await mollieCreate(record, originOf(request));
  if (payment && 'error' in payment) return json({ error: payment.error, id: record.id }, 502);
  if (!payment) {
    return json({
      error: 'De betaling van € 3,99 is nog niet gekoppeld. Vul in de backsite de Mollie-sleutel in. Je gegevens zijn wel bewaard.',
      id: record.id,
    }, 503);
  }
  record.paymentId = payment.id;
  record.checkout = payment.checkout;
  record.paymentStatus = 'open';
  await saveIntake(record);
  return json({ id: record.id, qr: payment.qr, checkout: payment.checkout, status: 'open', price: PRICE });
}
