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
 * Grote ZIP in één HTTP-request (geen stukjes).
 * Chunked upload uitgeschakeld — op Combell werkte enkele upload betrouwbaarder.
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
    `kan 30–90 minuten duren bij grote ZIP’s. Laat dit tabblad open en ververs niet.`
  );
}

export function formatZipUploadError(err: unknown): string {
  if (err instanceof Error) {
    const m = parseApiErrorBody(err.message);
    if (/internal server error/i.test(m)) {
      return (
        'De server kon de upload niet afronden (timeout of limiet). Wacht even en probeer opnieuw, ' +
        'of vraag Combell om een hogere uploadlimiet. Laat het tabblad open tijdens de upload.'
      );
    }
    return m;
  }
  return 'ZIP-upload mislukt';
}
