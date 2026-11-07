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
  archiveToken: string;
  remindedPaymentIds: string[];
  dossierFlags: Record<string, 'archived' | 'deleted'>;
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
  photoKeys?: Partial<Record<'full' | 'face' | 'side', string>>;
  reminderSent?: boolean;
};

const EMPTY: IntakeSettings = {
  openaiKey: '',
  mollieKey: '',
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPass: '',
  smtpFrom: '',
  archiveToken: '',
  remindedPaymentIds: [],
  dossierFlags: {},
};

const SLOTS = ['full', 'face', 'side'] as const;

function orderDir(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('ongeldig');
  return path.join(root, 'orders', id);
}

const SETTINGS_KEY = 'cm.internal.model-intake';
const SETTINGS_SECRET = scryptSync('cm-model-intake-runtime-v1', 'class-models-intake', 32);
const RUNTIME_TOKEN = 'cm-model-intake-runtime-v1';
const LIVE_API = (process.env.NEXT_PUBLIC_API_URL || 'https://api.class-models.be').replace(/\/$/, '');

function runtimeHeaders(json = false): Record<string, string> {
  return json
    ? { 'x-cm-model-intake': RUNTIME_TOKEN, 'Content-Type': 'application/json' }
    : { 'x-cm-model-intake': RUNTIME_TOKEN };
}

function pickText(primary: string, secondary: string, third: string) {
  return primary.trim() || secondary.trim() || third.trim();
}

function idList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function flagMap(value: unknown): Record<string, 'archived' | 'deleted'> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, 'archived' | 'deleted'> = {};
  for (const [key, flag] of Object.entries(value as Record<string, unknown>)) {
    const id = key.trim();
    if (!id) continue;
    if (flag === 'archived' || flag === 'deleted') out[id] = flag;
  }
  return out;
}

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

async function dbSettings(): Promise<IntakeSettings | null> {
  try {
    const res = await fetch(`${LIVE_API}/model-intake-settings/runtime`, {
      headers: runtimeHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as Partial<IntakeSettings>;
    return { ...EMPTY, ...raw, smtpPort: Number(raw.smtpPort) || 587 };
  } catch {
    return null;
  }
}

async function saveDbSettings(next: IntakeSettings) {
  const res = await fetch(`${LIVE_API}/model-intake-settings/runtime`, {
    method: 'PATCH',
    headers: runtimeHeaders(true),
    body: JSON.stringify(next),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || 'Opslaan mislukt.');
  }
}

export async function saveLiveSettings(token: string, patch: Partial<IntakeSettings>) {
  const prev = await readSettings();
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
    archiveToken: prev.archiveToken,
    remindedPaymentIds: prev.remindedPaymentIds,
    dossierFlags: prev.dossierFlags,
  };
  await saveSettingsEverywhere(token, next);
}

async function saveContentSettings(token: string, next: IntakeSettings) {
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

async function saveSettingsEverywhere(token: string, next: IntakeSettings) {
  let dbOk = false;
  let contentOk = false;
  let dbError: Error | null = null;
  try {
    await saveDbSettings(next);
    dbOk = true;
  } catch (error) {
    dbError = error instanceof Error ? error : new Error('Opslaan mislukt.');
  }
  try {
    await saveContentSettings(token, next);
    contentOk = true;
  } catch {
    contentOk = false;
  }
  try {
    await mkdir(root, { recursive: true });
    await writeFile(path.join(root, 'settings.json'), JSON.stringify(next), { mode: 0o600 });
  } catch {
    /* Vercel schrijft niet op schijf. */
  }
  if (!dbOk && !contentOk) throw dbError || new Error('Opslaan mislukt.');
}

export async function readSettings(): Promise<IntakeSettings> {
  const [db, remote] = await Promise.all([dbSettings(), remoteSettings()]);
  let local = { ...EMPTY };
  try {
    const raw = JSON.parse(await readFile(path.join(root, 'settings.json'), 'utf8')) as Partial<IntakeSettings>;
    local = { ...EMPTY, ...raw, smtpPort: Number(raw.smtpPort) || 587 };
  } catch {
    local = { ...EMPTY };
  }
  const a = db || EMPTY;
  const b = remote || EMPTY;
  return {
    openaiKey: pickText(a.openaiKey, b.openaiKey, local.openaiKey),
    mollieKey: pickText(a.mollieKey, b.mollieKey, local.mollieKey),
    smtpPass: pickText(a.smtpPass, b.smtpPass, local.smtpPass),
    smtpHost: pickText(a.smtpHost, b.smtpHost, local.smtpHost),
    smtpUser: pickText(a.smtpUser, b.smtpUser, local.smtpUser),
    smtpFrom: pickText(a.smtpFrom, b.smtpFrom, local.smtpFrom),
    smtpPort: Number(a.smtpHost ? a.smtpPort : b.smtpHost ? b.smtpPort : local.smtpPort) || 587,
    archiveToken: pickText(a.archiveToken, b.archiveToken, local.archiveToken),
    remindedPaymentIds: [idList(a.remindedPaymentIds), idList(b.remindedPaymentIds), idList(local.remindedPaymentIds)].sort(
      (left, right) => right.length - left.length,
    )[0] || [],
    dossierFlags: { ...flagMap(local.dossierFlags), ...flagMap(a.dossierFlags), ...flagMap(b.dossierFlags) },
  };
}

export async function setDossierFlags(token: string, keys: string[], op: 'archive' | 'delete' | 'restore') {
  const remote = await remoteSettings();
  if (!remote) throw new Error('De dossiers konden niet worden bijgewerkt.');
  const flags = flagMap(remote.dossierFlags);
  for (const key of keys) {
    const id = key.trim();
    if (!id) continue;
    if (op === 'restore') delete flags[id];
    else flags[id] = op === 'delete' ? 'deleted' : 'archived';
  }
  await saveContentSettings(token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`, {
    ...remote,
    dossierFlags: flags,
  });
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

function asRecord(raw: Partial<IntakeRecord> | null | undefined): IntakeRecord | null {
  if (!raw?.id) return null;
  return {
    id: String(raw.id),
    createdAt: String(raw.createdAt || new Date().toISOString()),
    firstName: String(raw.firstName || ''),
    lastName: String(raw.lastName || ''),
    email: String(raw.email || ''),
    gender: String(raw.gender || ''),
    ageGroup: raw.ageGroup === 'child' ? 'child' : 'adult',
    heightCm: raw.heightCm == null || !Number.isFinite(Number(raw.heightCm)) ? null : Number(raw.heightCm),
    childAge: raw.childAge == null || !Number.isFinite(Number(raw.childAge)) ? null : Number(raw.childAge),
    paymentId: String(raw.paymentId || ''),
    paymentStatus: String(raw.paymentStatus || 'open'),
    checkout: String(raw.checkout || ''),
    emailSent: Boolean(raw.emailSent),
    measures: Array.isArray(raw.measures) ? raw.measures : [],
    report: raw.report ?? null,
    photoKeys: raw.photoKeys && typeof raw.photoKeys === 'object' ? raw.photoKeys : undefined,
    reminderSent: Boolean(raw.reminderSent),
  };
}

async function remoteJson<T>(pathName: string): Promise<T | null> {
  try {
    const res = await fetch(`${LIVE_API}${pathName}`, { headers: runtimeHeaders(), cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function remoteUpsert(record: IntakeRecord, images?: string[]) {
  const form = new FormData();
  form.set('meta', JSON.stringify(record));
  if (images?.length) {
    for (let i = 0; i < SLOTS.length; i += 1) {
      const src = images[i];
      if (!src) continue;
      const match = src.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
      if (!match) continue;
      const bytes = Buffer.from(match[2], 'base64');
      form.append(SLOTS[i], new Blob([new Uint8Array(bytes)], { type: match[1] }), `${SLOTS[i]}.jpg`);
    }
  }
  const res = await fetch(`${LIVE_API}/model-intake/runtime`, {
    method: 'POST',
    headers: runtimeHeaders(),
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || 'Dossier opslaan mislukt.');
  }
}

async function writeLocal(record: IntakeRecord, images?: string[]) {
  const folder = orderDir(record.id);
  await mkdir(folder, { recursive: true });
  if (images?.length) {
    for (let i = 0; i < SLOTS.length; i += 1) {
      const src = images[i];
      if (!src) continue;
      const match = src.match(/^data:image\/(png|webp|jpeg|jpg);base64,([A-Za-z0-9+/=]+)$/);
      if (!match) throw new Error('foto');
      const ext = match[1] === 'png' ? 'png' : match[1] === 'webp' ? 'webp' : 'jpg';
      await writeFile(path.join(folder, `${SLOTS[i]}.${ext}`), Buffer.from(match[2], 'base64'));
    }
  }
  await writeFile(path.join(folder, 'intake.json'), JSON.stringify(record));
}

const DOSSIER_PREFIX = 'cm.internal.intake.';
let archiveCache: { at: number; rows: IntakeRecord[] } | null = null;

function bearer(token: string) {
  return token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
}

export async function rememberAdminToken(token: string) {
  const auth = bearer(token);
  const remote = await remoteSettings();
  if (!remote?.mollieKey && !remote?.smtpHost) return;
  if (remote.archiveToken === auth) return;
  await saveContentSettings(auth, { ...remote, archiveToken: auth });
}

export async function rememberPaymentReminder(paymentId: string, token: string) {
  const id = paymentId.trim();
  const auth = bearer(token);
  if (!id) return;
  const remote = await remoteSettings();
  if (!remote) return;
  const ids = new Set(idList(remote.remindedPaymentIds));
  if (ids.has(id)) return;
  ids.add(id);
  await saveContentSettings(auth, { ...remote, remindedPaymentIds: [...ids] });
}

async function listArchived() {
  if (archiveCache && Date.now() - archiveCache.at < 8000) return archiveCache.rows;
  try {
    const res = await fetch(`${LIVE_API}/content/strings?locale=en`, { cache: 'no-store' });
    if (!res.ok) return [] as IntakeRecord[];
    const rows = (await res.json()) as Array<{ key?: string; value?: string }>;
    const parsed = rows
      .filter((row) => String(row.key || '').startsWith(DOSSIER_PREFIX) && row.value)
      .map((row) => {
        try {
          return asRecord(JSON.parse(open(String(row.value))) as IntakeRecord);
        } catch {
          return null;
        }
      })
      .filter((row): row is IntakeRecord => Boolean(row));
    archiveCache = { at: Date.now(), rows: parsed };
    return parsed;
  } catch {
    return [] as IntakeRecord[];
  }
}

async function writeDossier(token: string, record: IntakeRecord) {
  const headers = { Authorization: bearer(token), 'Content-Type': 'application/json' };
  const key = `${DOSSIER_PREFIX}${record.id}`;
  const value = seal(JSON.stringify(record));
  let res = await fetch(`${LIVE_API}/content/strings`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ key, value, locale: 'en' }),
  });
  if (res.status === 404) {
    res = await fetch(`${LIVE_API}/content/strings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ key, value, locale: 'en' }),
    });
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || 'Dossier opslaan mislukt.');
  }
  archiveCache = null;
}

async function uploadPhotos(token: string, id: string, images: string[]) {
  const keys: Partial<Record<(typeof SLOTS)[number], string>> = {};
  for (let i = 0; i < SLOTS.length; i += 1) {
    const src = images[i];
    if (!src) continue;
    const match = src.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) continue;
    const bytes = Buffer.from(match[2], 'base64');
    const form = new FormData();
    form.set('file', new Blob([new Uint8Array(bytes)], { type: match[1] }), `${SLOTS[i]}.jpg`);
    const res = await fetch(`${LIVE_API}/media/upload?fileLabel=${encodeURIComponent(`modelanalyse-${id}-${SLOTS[i]}`)}`, {
      method: 'POST',
      headers: { Authorization: bearer(token) },
      body: form,
    });
    if (!res.ok) continue;
    const data = (await res.json().catch(() => ({}))) as { webpKey?: string; storageKey?: string };
    const file = String(data.webpKey || data.storageKey || '').trim();
    if (file) keys[SLOTS[i]] = file.split('/').pop() || file;
  }
  return keys;
}

async function archiveDossier(record: IntakeRecord, images?: string[]) {
  const token = (await readSettings()).archiveToken.trim();
  if (!token) return;
  if (images?.length && !record.photoKeys?.full) {
    const keys = await uploadPhotos(token, record.id, images);
    if (Object.keys(keys).length) record.photoKeys = { ...record.photoKeys, ...keys };
  }
  await writeDossier(token, record);
}

export async function saveIntake(record: IntakeRecord, images?: string[]) {
  let remoteOk = false;
  let localOk = false;
  let remoteError: Error | null = null;
  try {
    await remoteUpsert(record, images);
    remoteOk = true;
  } catch (error) {
    remoteError = error instanceof Error ? error : new Error('Dossier opslaan mislukt.');
  }
  try {
    await writeLocal(record, images);
    localOk = true;
  } catch {
    localOk = false;
  }
  try {
    await archiveDossier(record, images);
    remoteOk = true;
  } catch (error) {
    if (!remoteError) remoteError = error instanceof Error ? error : new Error('Dossier opslaan mislukt.');
  }
  if (!remoteOk && !localOk) {
    console.error('[model-intake] dossier niet bewaard', remoteError?.message || 'opslaan mislukt');
  }
}

export async function createIntake(
  meta: Omit<IntakeRecord, 'id' | 'createdAt' | 'paymentId' | 'paymentStatus' | 'checkout' | 'emailSent' | 'measures' | 'report'>,
  images: string[],
  measures: unknown[] = [],
) {
  const record: IntakeRecord = {
    ...meta,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    paymentId: '',
    paymentStatus: 'open',
    checkout: '',
    emailSent: false,
    measures,
    report: null,
  };
  await saveIntake(record, images);
  return record;
}

async function readLocal(id: string) {
  const raw = JSON.parse(await readFile(path.join(orderDir(id), 'intake.json'), 'utf8')) as IntakeRecord;
  return asRecord(raw);
}

async function archivedIntake(id: string) {
  const rows = await listArchived();
  return rows.find((row) => row.id === id || row.paymentId === id) || null;
}

export async function readIntake(id: string) {
  if (!id.startsWith('tr_')) {
    const remote = asRecord(await remoteJson<IntakeRecord>(`/model-intake/runtime/${encodeURIComponent(id)}`));
    if (remote) return remote;
    const local = await readLocal(id).catch(() => null);
    if (local) return local;
  } else {
    const row = asRecord(await remoteJson<IntakeRecord>(`/model-intake/runtime/by-payment/${encodeURIComponent(id)}`));
    if (row) return row;
  }
  const archived = await archivedIntake(id);
  if (archived) return archived;
  throw new Error('niet gevonden');
}

export async function intakeImages(id: string) {
  try {
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
  } catch {
    const images: string[] = [];
    for (const slot of SLOTS) {
      const photo = await intakePhoto(id, slot);
      if (!photo) throw new Error('foto');
      images.push(`data:${photo.mime};base64,${photo.buf.toString('base64')}`);
    }
    return images;
  }
}

export async function intakePhoto(id: string, slot: string) {
  if (!SLOTS.includes(slot as (typeof SLOTS)[number])) throw new Error('foto');
  const saved = await archivedIntake(id).catch(() => null);
  const file = saved?.photoKeys?.[slot as (typeof SLOTS)[number]];
  if (file) {
    try {
      const res = await fetch(`${LIVE_API}/media/public/${encodeURIComponent(file)}`, { cache: 'no-store' });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length) return { mime: res.headers.get('content-type') || 'image/jpeg', buf };
      }
    } catch {
      /* verder zoeken */
    }
  }
  try {
    const res = await fetch(`${LIVE_API}/model-intake/runtime/${encodeURIComponent(id)}/photo/${slot}`, {
      headers: runtimeHeaders(),
      cache: 'no-store',
    });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length) return { mime: res.headers.get('content-type') || 'image/jpeg', buf };
    }
  } catch {
    /* lokale foto hieronder */
  }
  try {
    const folder = orderDir(id);
    const files = await readdir(folder);
    const name = files.find((file) => file.startsWith(`${slot}.`));
    if (!name) return null;
    const ext = name.split('.').pop();
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return { mime, buf: await readFile(path.join(folder, name)) };
  } catch {
    return null;
  }
}

async function listLocal(): Promise<IntakeRecord[]> {
  try {
    const orders = path.join(root, 'orders');
    const ids = await readdir(orders);
    const rows = await Promise.all(ids.map((id) => readLocal(id).catch(() => null)));
    return rows.filter((row): row is IntakeRecord => Boolean(row));
  } catch {
    return [];
  }
}

function preferIntake(current: IntakeRecord, next: IntakeRecord) {
  const currentScore = (current.report ? 4 : 0) + (current.photoKeys?.full ? 2 : 0) + (current.email ? 1 : 0);
  const nextScore = (next.report ? 4 : 0) + (next.photoKeys?.full ? 2 : 0) + (next.email ? 1 : 0);
  return nextScore > currentScore ? next : current;
}

export async function listIntakes() {
  const remoteRaw = await remoteJson<IntakeRecord[]>('/model-intake/runtime');
  const remote = (remoteRaw || []).map((row) => asRecord(row)).filter((row): row is IntakeRecord => Boolean(row));
  const local = await listLocal();
  const archived = await listArchived();
  const byId = new Map<string, IntakeRecord>();
  for (const row of [...remote, ...local, ...archived]) {
    const prev = byId.get(row.id);
    byId.set(row.id, prev ? preferIntake(prev, row) : row);
  }
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
