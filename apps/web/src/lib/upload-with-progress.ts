export type UploadProgressUpdate = {
  percent: number;
  loaded: number;
  total: number;
  etaSeconds: number | null;
};

export function uploadWithProgress(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body: FormData;
    onProgress?: (p: UploadProgressUpdate) => void;
  },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const start = Date.now();
    xhr.open(options.method ?? 'POST', url, true);
    const headers = options.headers ?? {};
    for (const [k, v] of Object.entries(headers)) {
      xhr.setRequestHeader(k, v);
    }
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable || !options.onProgress) return;
      const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
      const elapsed = Math.max(0.001, (Date.now() - start) / 1000);
      const rate = e.loaded / elapsed;
      const remaining = rate > 0 && e.total > e.loaded ? (e.total - e.loaded) / rate : null;
      options.onProgress({
        percent,
        loaded: e.loaded,
        total: e.total,
        etaSeconds: remaining,
      });
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText);
        return;
      }
      reject(new Error(xhr.responseText || xhr.statusText || `HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Netwerkfout tijdens upload'));
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
