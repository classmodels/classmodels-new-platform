import { createWriteStream, existsSync, mkdirSync, statSync, unlinkSync } from 'fs';
import { basename, extname, join } from 'path';
import { pipeline } from 'stream/promises';
import * as unzipper from 'unzipper';

const MEDIA_EXT = /\.(jpe?g|webp|png|gif|mp4|webm|mov|m4v)$/i;

export type ZipExtractResult = {
  extracted: number;
  skippedEntries: number;
  bytesWritten: number;
  mediaRoot: string;
};

function safeEntryBaseName(entryPath: string): string | null {
  const norm = entryPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!norm || norm.includes('..')) return null;
  if (norm.startsWith('__MACOSX/') || norm.includes('/__MACOSX/')) return null;
  const base = basename(norm);
  if (!base || base.startsWith('.') || base === '.DS_Store') return null;
  if (!MEDIA_EXT.test(base)) return null;
  return base;
}

function uniqueDestPath(destRoot: string, base: string): string {
  let dest = join(destRoot, base);
  if (!existsSync(dest)) return dest;
  const ext = extname(base);
  const stem = ext ? base.slice(0, -ext.length) : base;
  let n = 2;
  while (n < 10_000) {
    const candidate = join(destRoot, `${stem}-${n}${ext}`);
    if (!existsSync(candidate)) return candidate;
    n += 1;
  }
  return join(destRoot, `${stem}-${Date.now()}${ext}`);
}

/** Pakt een .zip uit naar MEDIA_ROOT (platte bestandsnamen). */
export async function extractZipArchiveToMediaRoot(
  zipPath: string,
  destRoot: string,
): Promise<ZipExtractResult> {
  mkdirSync(destRoot, { recursive: true });
  const directory = await unzipper.Open.file(zipPath);
  let extracted = 0;
  let skippedEntries = 0;
  let bytesWritten = 0;

  for (const entry of directory.files) {
    if (entry.type === 'Directory') continue;
    const base = safeEntryBaseName(entry.path);
    if (!base) {
      skippedEntries += 1;
      continue;
    }
    const dest = uniqueDestPath(destRoot, base);
    try {
      await pipeline(entry.stream(), createWriteStream(dest));
      bytesWritten += statSync(dest).size;
      extracted += 1;
    } catch {
      skippedEntries += 1;
      try {
        unlinkSync(dest);
      } catch {
        /**/
      }
    }
  }

  return { extracted, skippedEntries, bytesWritten, mediaRoot: destRoot };
}

export function mediaZipUploadMaxBytes(): number {
  const raw = process.env.MEDIA_ZIP_UPLOAD_MAX_BYTES?.trim();
  if (raw) {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) {
      return Math.min(n, 8 * 1024 * 1024 * 1024);
    }
  }
  return 6 * 1024 * 1024 * 1024;
}
