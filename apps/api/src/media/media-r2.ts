import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createReadStream, statSync } from 'fs';
import { Readable } from 'stream';
import type { Readable as ReadableType } from 'stream';

export function mediaUsesR2(): boolean {
  const backend = (process.env.MEDIA_BACKEND || process.env.MEDIA_STORAGE_PROVIDER || '')
    .trim()
    .toLowerCase();
  if (['r2', 'cloudflare-r2', 'cloudflare_r2', 's3'].includes(backend)) return true;
  if (backend && !['local', 'disk', 'filesystem', ''].includes(backend)) return false;
  return Boolean(
    process.env.R2_BUCKET?.trim() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      (process.env.R2_ENDPOINT?.trim() || process.env.R2_ACCOUNT_ID?.trim()),
  );
}

export function r2BucketName(): string {
  const b = process.env.R2_BUCKET?.trim();
  if (!b) throw new Error('R2_BUCKET ontbreekt');
  return b;
}

export function createR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  if (!endpoint) throw new Error('R2_ENDPOINT of R2_ACCOUNT_ID ontbreekt');
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY ontbreken');
  }
  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

let cachedClient: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!cachedClient) cachedClient = createR2Client();
  return cachedClient;
}

export async function r2ObjectExists(key: string): Promise<boolean> {
  try {
    await getR2Client().send(
      new HeadObjectCommand({ Bucket: r2BucketName(), Key: key }),
    );
    return true;
  } catch (e: unknown) {
    const code =
      e && typeof e === 'object' && 'name' in e ? String((e as { name?: string }).name) : '';
    if (code === 'NotFound' || code === 'NoSuchKey') return false;
    const status =
      e && typeof e === 'object' && '$metadata' in e ?
        (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
      : undefined;
    if (status === 404) return false;
    throw e;
  }
}

export async function r2ObjectSize(key: string): Promise<number | null> {
  try {
    const head = await getR2Client().send(
      new HeadObjectCommand({ Bucket: r2BucketName(), Key: key }),
    );
    const n = head.ContentLength;
    return typeof n === 'number' && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export async function r2GetObjectStream(key: string): Promise<ReadableType> {
  const out = await getR2Client().send(
    new GetObjectCommand({ Bucket: r2BucketName(), Key: key }),
  );
  const body = out.Body;
  if (!body) throw new Error(`R2 object leeg: ${key}`);
  if (body instanceof Readable) return body;
  throw new Error(`Onverwacht R2 body-type voor ${key}`);
}

export async function r2PutLocalFile(
  key: string,
  localPath: string,
  contentType?: string,
): Promise<void> {
  const size = statSync(localPath).size;
  const body = createReadStream(localPath);
  if (size > 80 * 1024 * 1024) {
    await new Upload({
      client: getR2Client(),
      params: {
        Bucket: r2BucketName(),
        Key: key,
        Body: body,
        ContentType: contentType,
      },
      queueSize: 4,
      partSize: 10 * 1024 * 1024,
      leavePartsOnError: false,
    }).done();
    return;
  }
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: r2BucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function r2PutBuffer(
  key: string,
  body: Buffer,
  contentType?: string,
): Promise<void> {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: r2BucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function r2DeleteObject(key: string): Promise<void> {
  try {
    await getR2Client().send(
      new DeleteObjectCommand({ Bucket: r2BucketName(), Key: key }),
    );
  } catch {
    /**/
  }
}

export function logR2Boot(): void {
  if (!mediaUsesR2()) return;
  try {
    const bucket = r2BucketName();
    const endpoint =
      process.env.R2_ENDPOINT?.trim() ||
      `https://${process.env.R2_ACCOUNT_ID?.trim()}.r2.cloudflarestorage.com`;
    console.error(`[media] opslag=R2 bucket=${bucket} endpoint=${endpoint}`);
  } catch (e) {
    console.error('[media] R2 config onvolledig:', e instanceof Error ? e.message : e);
  }
}
