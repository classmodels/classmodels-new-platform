import { getLargeUploadApiBase, parseApiErrorBody } from '@/lib/api';
import { type UploadProgressUpdate, uploadWithProgress } from '@/lib/upload-with-progress';

export type ZipUploadOptions = {
  file: File;
  folderId: string;
  token: string;
  onProgress?: (p: UploadProgressUpdate) => void;
  onUploadBytesComplete?: () => void;
};

/**
 * Grote ZIP altijd in één HTTP-request naar api.class-models.be (geen stukjes).
 * Chunked upload faalde op Combell (fragment 1/311 incompleet); enkele upload bereikte wel 80%+.
 */
export async function uploadZipReliable(opts: ZipUploadOptions): Promise<string> {
  const apiBase = getLargeUploadApiBase();
  const { file, folderId, token, onProgress, onUploadBytesComplete } = opts;

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

export function zipUploadApiLabel(): string {
  return getLargeUploadApiBase();
}

export function zipUploadModeLabel(file: File): string {
  const gb = (file.size / (1024 * 1024 * 1024)).toFixed(2);
  return (
    `Eén bestand (${gb} GB) rechtstreeks naar ${zipUploadApiLabel()} — ` +
    `kan 30–90 minuten duren. Laat dit tabblad open en ververs niet.`
  );
}

export function formatZipUploadError(err: unknown): string {
  if (err instanceof Error) return parseApiErrorBody(err.message);
  return 'ZIP-upload mislukt';
}
