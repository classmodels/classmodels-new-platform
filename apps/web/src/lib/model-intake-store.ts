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

export async function readSettings(): Promise<IntakeSettings> {
  try {
    const raw = JSON.parse(await readFile(path.join(root, 'settings.json'), 'utf8')) as Partial<IntakeSettings>;
    return {
      ...EMPTY,
      ...raw,
      smtpPort: Number(raw.smtpPort) || 587,
    };
  } catch {
    return { ...EMPTY };
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
