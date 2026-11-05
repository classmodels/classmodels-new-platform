import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { randomUUID } from 'crypto';
import { mkdir, readFile, readdir, writeFile } from 'fs/promises';
import path from 'path';

const root = path.join(process.cwd(), 'data', 'model-intake');

export type IntakeSettings = {
  openaiKey: string;
  mollieKey: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
};

export type IntakeRecord = {
  id: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  email: string;
  gender: string;
  ageGroup: 'adult' | 'child';
  heightCm: number | null;
  childAge: number | null;
  paymentId: string;
  paymentStatus: string;
  checkout: string;
  emailSent: boolean;
  measures: unknown[];
  report: unknown | null;
};

const EMPTY: IntakeSettings = {
  openaiKey: '',
  mollieKey: '',
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPass: '',
  smtpFrom: '',
};

const SLOTS = ['full', 'face', 'side'] as const;

function orderDir(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('ongeldig');
  return path.join(root, 'orders', id);
}

const SETTINGS_KEY = 'cm.internal.model-intake';
const SETTINGS_SECRET = scryptSync('cm-model-intake-runtime-v1', 'class-models-intake', 32);
const LIVE_API = (process.env.NEXT_PUBLIC_API_URL || 'https://api.class-models.be').replace(/\/$/, '');

function seal(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', SETTINGS_SECRET, iv);
  const enc = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `enc:v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${enc.toString('base64')}`;
}

function open(payload: string) {
  const parts = payload.split(':');
  if (parts.length !== 5 || parts[0] !== 'enc' || parts[1] !== 'v1') throw new Error('seal');
  const decipher = createDecipheriv('aes-256-gcm', SETTINGS_SECRET, Buffer.from(parts[2], 'base64'));
  decipher.setAuthTag(Buffer.from(parts[3], 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(parts[4], 'base64')), decipher.final()]).toString('utf8');
}

async function remoteSettings(): Promise<IntakeSettings | null> {
  try {
    const res = await fetch(`${LIVE_API}/content/strings?locale=nl`, { cache: 'no-store' });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ key?: string; value?: string }>;
    const row = rows.find((item) => item.key === SETTINGS_KEY);
    if (!row?.value) return null;
    const raw = JSON.parse(open(row.value)) as Partial<IntakeSettings>;
    return { ...EMPTY, ...raw, smtpPort: Number(raw.smtpPort) || 587 };
  } catch {
    return null;
  }
}

export async function saveLiveSettings(token: string, patch: Partial<IntakeSettings>) {
  const prev = (await remoteSettings()) || { ...EMPTY };
  const keep = (next: unknown, previous: string) => {
    const value = String(next ?? '').trim();
    return value || previous;
  };
  const next: IntakeSettings = {
    openaiKey: keep(patch.openaiKey, prev.openaiKey),
    mollieKey: keep(patch.mollieKey, prev.mollieKey),
    smtpPass: keep(patch.smtpPass, prev.smtpPass),
    smtpHost: patch.smtpHost == null ? prev.smtpHost : String(patch.smtpHost).trim(),
    smtpUser: patch.smtpUser == null ? prev.smtpUser : String(patch.smtpUser).trim(),
    smtpFrom: patch.smtpFrom == null ? prev.smtpFrom : String(patch.smtpFrom).trim(),
    smtpPort: Number(patch.smtpPort) || prev.smtpPort || 587,
  };
  const headers = { Authorization: token, 'Content-Type': 'application/json' };
  const value = seal(JSON.stringify(next));
  let res = await fetch(`${LIVE_API}/content/strings`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ key: SETTINGS_KEY, value, locale: 'nl' }),
  });
  if (res.status === 404) {
    res = await fetch(`${LIVE_API}/content/strings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ key: SETTINGS_KEY, value, locale: 'nl' }),
    });
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || 'Opslaan mislukt.');
  }
}

export async function readSettings(): Promise<IntakeSettings> {
  const remote = await remoteSettings();
  try {
    const raw = JSON.parse(await readFile(path.join(root, 'settings.json'), 'utf8')) as Partial<IntakeSettings>;
    const local = {
      ...EMPTY,
      ...raw,
      smtpPort: Number(raw.smtpPort) || 587,
    };
    if (!remote) return local;
    return {
      openaiKey: local.openaiKey || remote.openaiKey,
      mollieKey: local.mollieKey || remote.mollieKey,
      smtpHost: local.smtpHost || remote.smtpHost,
      smtpPort: local.smtpHost ? local.smtpPort : remote.smtpPort,
      smtpUser: local.smtpUser || remote.smtpUser,
      smtpPass: local.smtpPass || remote.smtpPass,
      smtpFrom: local.smtpFrom || remote.smtpFrom,
    };
  } catch {
    return remote || { ...EMPTY };
  }
}

export async function writeSettings(patch: Partial<IntakeSettings>) {
  await mkdir(root, { recursive: true });
  const prev = await readSettings();
  const next = { ...prev };
  const secrets = new Set(['openaiKey', 'mollieKey', 'smtpPass']);
  for (const [key, value] of Object.entries(patch) as [keyof IntakeSettings, IntakeSettings[keyof IntakeSettings]][]) {
    if (value == null) continue;
    if (secrets.has(key) && String(value).trim() === '') continue;
    if (key === 'smtpPort') next.smtpPort = Number(value) || 587;
    else (next as Record<string, unknown>)[key] = String(value).trim();
  }
  await writeFile(path.join(root, 'settings.json'), JSON.stringify(next), { mode: 0o600 });
  return next;
}

export async function openaiKey() {
  const saved = (await readSettings()).openaiKey.trim();
  return saved || String(process.env.CLASS_MODELS_AI_KEY || process.env.OPENAI_API_KEY || '').trim();
}

export async function mollieKey() {
  const saved = (await readSettings()).mollieKey.trim();
  const env = String(process.env.MOLLIE_API_KEY || process.env.MOLLIE_API_KEY_LIVE || '').trim();
  const key = saved || env;
  return key.startsWith('test_') || key.startsWith('live_') ? key : '';
}

export async function createIntake(
  meta: Omit<IntakeRecord, 'id' | 'createdAt' | 'paymentId' | 'paymentStatus' | 'checkout' | 'emailSent' | 'measures' | 'report'>,
  images: string[],
) {
  const id = randomUUID();
  const folder = orderDir(id);
  await mkdir(folder, { recursive: true });
  for (let i = 0; i < SLOTS.length; i += 1) {
    const match = images[i].match(/^data:image\/(png|webp|jpeg|jpg);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) throw new Error('foto');
    const ext = match[1] === 'png' ? 'png' : match[1] === 'webp' ? 'webp' : 'jpg';
    await writeFile(path.join(folder, `${SLOTS[i]}.${ext}`), Buffer.from(match[2], 'base64'));
  }
  const record: IntakeRecord = {
    ...meta,
    id,
    createdAt: new Date().toISOString(),
    paymentId: '',
    paymentStatus: 'open',
    checkout: '',
    emailSent: false,
    measures: [],
    report: null,
  };
  await writeFile(path.join(folder, 'intake.json'), JSON.stringify(record));
  return record;
}

export async function readIntake(id: string) {
  const raw = await readFile(path.join(orderDir(id), 'intake.json'), 'utf8');
  return JSON.parse(raw) as IntakeRecord;
}

export async function saveIntake(record: IntakeRecord) {
  await writeFile(path.join(orderDir(record.id), 'intake.json'), JSON.stringify(record));
}

export async function intakeImages(id: string) {
  const folder = orderDir(id);
  const files = await readdir(folder);
  const images: string[] = [];
  for (const slot of SLOTS) {
    const name = files.find((file) => file.startsWith(`${slot}.`));
    if (!name) throw new Error('foto');
    const ext = name.split('.').pop();
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const buf = await readFile(path.join(folder, name));
    images.push(`data:${mime};base64,${buf.toString('base64')}`);
  }
  return images;
}

export async function intakePhoto(id: string, slot: string) {
  if (!SLOTS.includes(slot as (typeof SLOTS)[number])) throw new Error('foto');
  const folder = orderDir(id);
  const files = await readdir(folder);
  const name = files.find((file) => file.startsWith(`${slot}.`));
  if (!name) return null;
  const ext = name.split('.').pop();
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return { mime, buf: await readFile(path.join(folder, name)) };
}

export async function listIntakes() {
  try {
    const orders = path.join(root, 'orders');
    const ids = await readdir(orders);
    const rows = await Promise.all(
      ids.map(async (id) => {
        try {
          return await readIntake(id);
        } catch {
          return null;
        }
      }),
    );
    return rows
      .filter((row): row is IntakeRecord => Boolean(row))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}
