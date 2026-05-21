import { parseApiErrorBody } from '@/lib/api';

export type UploadProgressUpdate = {
  percent: number;
  loaded: number;
  total: number;
  etaSeconds: number | null;
};

/** 6 uur — enkele POST van ZIP tot ~6 GB. */
const DEFAULT_UPLOAD_TIMEOUT_MS = 21_600_000;

export function uploadWithProgress(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body: FormData;
    timeoutMs?: number;
    onProgress?: (p: UploadProgressUpdate) => void;
    /** Aanroep zodra alle bytes naar de server zijn gestuurd (server verwerkt nog). */
    onUploadBytesComplete?: () => void;
  },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const start = Date.now();
    let bytesCompleteCalled = false;
    xhr.open(options.method ?? 'POST', url, true);
    xhr.timeout = options.timeoutMs ?? DEFAULT_UPLOAD_TIMEOUT_MS;
    const headers = options.headers ?? {};
    for (const [k, v] of Object.entries(headers)) {
      xhr.setRequestHeader(k, v);
    }
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const bytesDone = e.loaded >= e.total;
      const percent = bytesDone ? 100 : Math.min(99, Math.floor((e.loaded / e.total) * 100));
      const elapsed = Math.max(0.001, (Date.now() - start) / 1000);
      const rate = e.loaded / elapsed;
      const remaining =
        !bytesDone && rate > 0 && e.total > e.loaded ? (e.total - e.loaded) / rate : null;
      options.onProgress?.({
        percent,
        loaded: e.loaded,
        total: e.total,
        etaSeconds: remaining,
      });
      if (bytesDone && !bytesCompleteCalled) {
        bytesCompleteCalled = true;
        options.onUploadBytesComplete?.();
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText);
        return;
      }
      reject(new Error(parseApiErrorBody(xhr.responseText || xhr.statusText || `HTTP ${xhr.status}`)));
    };
    xhr.onerror = () =>
      reject(
        new Error(
          'Netwerkfout tijdens upload. Laat de upload afronden zonder te verversen; bij een grote ZIP kan dit 30–60 minuten duren.',
        ),
      );
    xhr.ontimeout = () =>
      reject(
        new Error(
          'Upload-timeout. Probeer opnieuw of gebruik een stabiele verbinding; ververs de pagina niet tijdens de upload.',
        ),
      );
    xhr.onabort = () => reject(new Error('Upload geannuleerd'));
    xhr.send(options.body);
  });
}

export function formatEtaSeconds(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return '—';
  const s = Math.max(0, Math.ceil(sec));
  if (s < 60) return `±${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r > 0 ? `±${m} min ${r} s` : `±${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `±${h} u ${rm} min` : `±${h} u`;
}
