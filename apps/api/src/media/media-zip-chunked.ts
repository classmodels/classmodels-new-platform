import {
  closeSync,
  existsSync,
  ftruncateSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
  writeSync,
} from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { resolveMediaRoot } from '../config/resolve-media-root';
import { mediaZipUploadMaxBytes } from './media-zip-import';

/** Per chunk-request — onder typische proxy-limieten; grote ZIP = veel kleine requests. */
export const ZIP_UPLOAD_CHUNK_BYTES = 32 * 1024 * 1024;

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
  const dir = join(resolveMediaRoot(), '.zip-upload-tmp', 'sessions');
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
  const dir = sessionDir(uploadId);
  mkdirSync(dir, { recursive: true });
  const totalChunks = Math.ceil(totalSize / ZIP_UPLOAD_CHUNK_BYTES);
  const assembly = assemblyPath(uploadId);
  const fd = openSync(assembly, 'w');
  try {
    ftruncateSync(fd, totalSize);
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

export function writeZipChunk(
  uploadId: string,
  chunkIndex: number,
  chunkDiskPath: string,
  userId: string,
): { received: number; totalChunks: number } {
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
  const buf = readFileSync(chunkDiskPath);
  try {
    unlinkSync(chunkDiskPath);
  } catch {
    /**/
  }
  if (buf.length !== expectedLen) throw new Error('chunk_size_mismatch');

  const fd = openSync(assemblyPath(uploadId), 'r+');
  try {
    writeSync(fd, buf, 0, buf.length, offset);
  } finally {
    closeSync(fd);
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
