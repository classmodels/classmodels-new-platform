import { getLargeUploadApiBase, getZipUploadApiBase, parseApiErrorBody } from '@/lib/api';
import { uploadZipChunked } from '@/lib/upload-zip-chunked';
import { type UploadProgressUpdate, uploadWithProgress } from '@/lib/upload-with-progress';

export type ZipUploadOptions = {
  file: File;
  folderId: string;
  token: string;
  onProgress?: (p: UploadProgressUpdate) => void;
  onUploadBytesComplete?: () => void;
};

/** Boven deze grootte: upload in delen (Combell weigert vaak één POST van 1+ GB). */
const CHUNKED_UPLOAD_THRESHOLD_BYTES = 48 * 1024 * 1024;

export async function uploadZipReliable(opts: ZipUploadOptions): Promise<string> {
  const { file, folderId, token, onProgress, onUploadBytesComplete } = opts;

  if (file.size > CHUNKED_UPLOAD_THRESHOLD_BYTES) {
    const apiBase = getZipUploadApiBase();
    return uploadZipChunked(file, {
      apiBase,
      folderId,
      token,
      onProgress,
      onUploadBytesComplete,
    });
  }

  const apiBase = getLargeUploadApiBase();
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
  return getZipUploadApiBase();
}

export function zipUploadModeLabel(file: File): string {
  const gb = (file.size / (1024 * 1024 * 1024)).toFixed(2);
  if (file.size > CHUNKED_UPLOAD_THRESHOLD_BYTES) {
    const estChunks = Math.ceil(file.size / (8 * 1024 * 1024));
    return (
      `Upload in kleine delen (${gb} GB, ±${estChunks} requests) naar ${zipUploadApiLabel()} — ` +
      `veiliger op Combell dan één groot bestand. Laat dit tabblad open.`
    );
  }
  return (
    `Eén bestand (${gb} GB) naar ${zipUploadApiLabel()} — ` +
    `kan enkele minuten duren. Laat dit tabblad open.`
  );
}

export function formatZipUploadError(err: unknown): string {
  if (err instanceof Error) {
    const m = parseApiErrorBody(err.message);
    if (/internal server error/i.test(m)) {
      return (
        'Serverfout tijdens ZIP-upload. Bij bestanden > 48 MB wordt automatisch in delen geüpload; ' +
        'ververs de pagina en probeer opnieuw. Controleer of er genoeg schijfruimte is op de server (MEDIA_ROOT). ' +
        'Blijft het mis: vraag Combell om een hogere uploadlimiet op api.class-models.be.'
      );
    }
    return m;
  }
  return 'ZIP-upload mislukt';
}
