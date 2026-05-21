import { parseApiErrorBody } from '@/lib/api';
import { type UploadProgressUpdate, uploadWithProgress } from '@/lib/upload-with-progress';

const CHUNK_REQUEST_TIMEOUT_MS = 600_000;
const MAX_CHUNK_RETRIES = 4;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function uploadZipChunked(
  file: File,
  opts: {
    apiBase: string;
    folderId: string;
    token: string;
    onProgress?: (p: UploadProgressUpdate) => void;
    onUploadBytesComplete?: () => void;
  },
): Promise<string> {
  const base = opts.apiBase.replace(/\/$/, '');
  const auth = { Authorization: `Bearer ${opts.token}` };

  const initRes = await fetch(`${base}/media/upload-zip/init`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      folderId: opts.folderId,
      fileName: file.name,
      totalSize: file.size,
    }),
  });
  const initText = await initRes.text();
  if (!initRes.ok) throw new Error(parseApiErrorBody(initText || initRes.statusText));

  const { uploadId, chunkSize, totalChunks } = JSON.parse(initText) as {
    uploadId: string;
    chunkSize: number;
    totalChunks: number;
  };

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const blob = file.slice(start, end);
    const chunkUrl = `${base}/media/upload-zip/chunk?uploadId=${encodeURIComponent(uploadId)}&chunkIndex=${i}`;

    let lastErr: Error | null = null;
    for (let attempt = 0; attempt < MAX_CHUNK_RETRIES; attempt++) {
      if (attempt > 0) await sleep(1500 * attempt);
      const fd = new FormData();
      fd.append('chunk', blob, `part-${String(i).padStart(5, '0')}.bin`);
      try {
        await uploadWithProgress(chunkUrl, {
          headers: auth,
          body: fd,
          timeoutMs: CHUNK_REQUEST_TIMEOUT_MS,
          onProgress: (p) => {
            const overall = Math.floor(((i + p.percent / 100) / totalChunks) * 100);
            opts.onProgress?.({
              percent: Math.min(99, overall),
              loaded: end,
              total: file.size,
              etaSeconds: p.etaSeconds,
            });
          },
        });
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
      }
    }
    if (lastErr) {
      throw new Error(
        `Deel ${i + 1}/${totalChunks} mislukt na ${MAX_CHUNK_RETRIES} pogingen: ${parseApiErrorBody(lastErr.message)}`,
      );
    }

    opts.onProgress?.({
      percent: Math.min(99, Math.floor(((i + 1) / totalChunks) * 100)),
      loaded: end,
      total: file.size,
      etaSeconds: null,
    });
  }

  opts.onUploadBytesComplete?.();

  const finRes = await fetch(`${base}/media/upload-zip/finish`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadId }),
  });
  const finText = await finRes.text();
  if (!finRes.ok) throw new Error(parseApiErrorBody(finText || finRes.statusText));
  return finText;
}
