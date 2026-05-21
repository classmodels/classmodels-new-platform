import { getLargeUploadApiBase, parseApiErrorBody } from '@/lib/api';
import { type UploadProgressUpdate, uploadWithProgress } from '@/lib/upload-with-progress';
import { uploadZipChunked } from '@/lib/upload-zip-chunked';

/** Boven deze grootte: upload in delen (op server één ZIP); kleiner = één POST. */
export const ZIP_SINGLE_UPLOAD_MAX_BYTES = 80 * 1024 * 1024;

export type ZipUploadOptions = {
  file: File;
  folderId: string;
  token: string;
  onProgress?: (p: UploadProgressUpdate) => void;
  onUploadBytesComplete?: () => void;
};

/** Grote ZIP’s betrouwbaar uploaden (api-host + chunked of enkelvoudig). */
export async function uploadZipReliable(opts: ZipUploadOptions): Promise<string> {
  const apiBase = getLargeUploadApiBase();
  const { file, folderId, token, onProgress, onUploadBytesComplete } = opts;

  if (file.size >= ZIP_SINGLE_UPLOAD_MAX_BYTES) {
    return uploadZipChunked(file, {
      apiBase,
      folderId,
      token,
      onProgress,
      onUploadBytesComplete,
    });
  }

  const fd = new FormData();
  fd.append('file', file);
  return uploadWithProgress(
    `${apiBase}/media/upload-zip?folderId=${encodeURIComponent(folderId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
      timeoutMs: 21_600_000,
      onProgress,
      onUploadBytesComplete,
    },
  );
}

export function zipUploadModeLabel(file: File): string {
  if (file.size >= ZIP_SINGLE_UPLOAD_MAX_BYTES) {
    const parts = Math.ceil(file.size / (16 * 1024 * 1024));
    return `Upload in ${parts} delen (±16 MB) naar api-server — wordt één ZIP-bestand in de map`;
  }
  return `Upload in één bestand naar api-server`;
}

export function formatZipUploadError(err: unknown): string {
  if (err instanceof Error) return parseApiErrorBody(err.message);
  return 'ZIP-upload mislukt';
}
