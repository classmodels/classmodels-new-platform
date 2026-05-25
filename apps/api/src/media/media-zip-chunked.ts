import {
  closeSync,
  existsSync,
  ftruncateSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
  unlinkSync,
  writeFileSync,
  writeSync,
} from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { resolveWritableMediaRoot } from '../config/resolve-media-root';
import { mediaZipUploadMaxBytes } from './media-zip-import';

function chunkBytesFromEnv(): number {
  const raw = process.env.ZIP_UPLOAD_CHUNK_BYTES?.trim();
  if (raw) {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 4 * 1024 * 1024 && n <= 32 * 1024 * 1024) return n;
  }
  /** 8 MB — past onder vrijwel alle proxy body-limieten. */
  return 8 * 1024 * 1024;
}

export const ZIP_UPLOAD_CHUNK_BYTES = chunkBytesFromEnv();

export type ZipChunkSessionMeta = {
  uploadId: string;
  folderId: string;
  fileName: string;
  totalSize: number;
  totalChunks: number;
  userId: string;
  createdAt: number;
  received: number[];
};

export function zipChunkSessionsRoot(): string {
  const dir = join(resolveWritableMediaRoot(), '.zip-upload-tmp', 'sessions');
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function sessionDir(uploadId: string): string {
  const safe = uploadId.replace(/[^a-f0-9-]/gi, '');
  if (!safe || safe !== uploadId) throw new Error('invalid_upload_id');
  return join(zipChunkSessionsRoot(), safe);
}

export function metaPath(uploadId: string): string {
  return join(sessionDir(uploadId), 'meta.json');
}

export function assemblyPath(uploadId: string): string {
  return join(sessionDir(uploadId), 'assembly.zip');
}

export function loadMeta(uploadId: string): ZipChunkSessionMeta {
  const p = metaPath(uploadId);
  if (!existsSync(p)) throw new Error('upload_session_not_found');
  return JSON.parse(readFileSync(p, 'utf8')) as ZipChunkSessionMeta;
}

export function saveMeta(meta: ZipChunkSessionMeta): void {
  mkdirSync(sessionDir(meta.uploadId), { recursive: true });
  writeFileSync(metaPath(meta.uploadId), JSON.stringify(meta), 'utf8');
}

export function createZipChunkSession(
  folderId: string,
  fileName: string,
  totalSize: number,
  userId: string,
): { uploadId: string; chunkSize: number; totalChunks: number } {
  if (!/\.zip$/i.test(fileName)) throw new Error('not_a_zip');
  const max = mediaZipUploadMaxBytes();
  if (totalSize <= 0 || totalSize > max) throw new Error('size_out_of_range');

  const uploadId = randomUUID();
  mkdirSync(sessionDir(uploadId), { recursive: true });
  const totalChunks = Math.ceil(totalSize / ZIP_UPLOAD_CHUNK_BYTES);
  const assembly = assemblyPath(uploadId);
  const fd = openSync(assembly, 'w');
  try {
    ftruncateSync(fd, totalSize);
  } catch {
    closeSync(fd);
    try {
      unlinkSync(assembly);
    } catch {
      /**/
    }
    throw new Error('disk_full_or_quota');
  } finally {
    closeSync(fd);
  }

  const meta: ZipChunkSessionMeta = {
    uploadId,
    folderId,
    fileName,
    totalSize,
    totalChunks,
    userId,
    createdAt: Date.now(),
    received: [],
  };
  saveMeta(meta);
  return { uploadId, chunkSize: ZIP_UPLOAD_CHUNK_BYTES, totalChunks };
}

/** Schrijf chunk naar vaste offset in assembly.zip (betrouwbaarder dan stream r+). */
function copyChunkToAssembly(
  assembly: string,
  offset: number,
  chunkPath: string,
  maxBytes: number,
): number {
  const st = statSync(chunkPath);
  const toCopy = Math.min(st.size, maxBytes);
  if (toCopy <= 0) throw new Error('chunk_empty');

  const fdAsm = openSync(assembly, 'r+');
  const fdChunk = openSync(chunkPath, 'r');
  const bufSize = 1024 * 1024;
  let written = 0;
  try {
    while (written < toCopy) {
      const n = Math.min(bufSize, toCopy - written);
      const buf = Buffer.allocUnsafe(n);
      const r = readSync(fdChunk, buf, 0, n, written);
      if (r <= 0) break;
      writeSync(fdAsm, buf, 0, r, offset + written);
      written += r;
    }
  } finally {
    closeSync(fdAsm);
    closeSync(fdChunk);
  }
  if (written !== toCopy) throw new Error('chunk_incomplete');
  return written;
}

export async function writeZipChunk(
  uploadId: string,
  chunkIndex: number,
  chunkDiskPath: string,
  userId: string,
  reportedBytes?: number,
): Promise<{ received: number; totalChunks: number }> {
  const meta = loadMeta(uploadId);
  if (meta.userId !== userId) throw new Error('forbidden');
  if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= meta.totalChunks) {
    throw new Error('invalid_chunk_index');
  }
  if (meta.received.includes(chunkIndex)) {
    try {
      unlinkSync(chunkDiskPath);
    } catch {
      /**/
    }
    return { received: meta.received.length, totalChunks: meta.totalChunks };
  }

  const offset = chunkIndex * ZIP_UPLOAD_CHUNK_BYTES;
  const expectedLen = Math.min(ZIP_UPLOAD_CHUNK_BYTES, meta.totalSize - offset);
  const sizeOnDisk = statSync(chunkDiskPath).size;
  const nbytes =
    reportedBytes != null && reportedBytes > 0 ?
      Math.min(reportedBytes, sizeOnDisk)
    : sizeOnDisk;

  const isLast = chunkIndex === meta.totalChunks - 1;
  if (!isLast && nbytes !== expectedLen) {
    throw new Error(`chunk_size_mismatch:${nbytes}:${expectedLen}`);
  }
  if (isLast && nbytes > expectedLen) {
    throw new Error(`chunk_size_mismatch:${nbytes}:${expectedLen}`);
  }
  if (nbytes <= 0) throw new Error('chunk_empty');

  const assembly = assemblyPath(uploadId);
  copyChunkToAssembly(assembly, offset, chunkDiskPath, nbytes);

  try {
    unlinkSync(chunkDiskPath);
  } catch {
    /**/
  }

  meta.received.push(chunkIndex);
  meta.received.sort((a, b) => a - b);
  saveMeta(meta);
  return { received: meta.received.length, totalChunks: meta.totalChunks };
}

export function assertZipChunkSessionComplete(uploadId: string, userId: string): ZipChunkSessionMeta {
  const meta = loadMeta(uploadId);
  if (meta.userId !== userId) throw new Error('forbidden');
  if (meta.received.length !== meta.totalChunks) throw new Error('incomplete_chunks');
  const st = statSync(assemblyPath(uploadId));
  if (st.size !== meta.totalSize) throw new Error('assembly_incomplete');
  return meta;
}
