import { parseApiErrorBody } from '@/lib/api';

export type DownloadProgressPhase = 'connecting' | 'downloading' | 'saving' | 'done';

export type DownloadProgressUpdate = {
  percent: number | null;
  loaded: number;
  total: number | null;
  indeterminate: boolean;
  phase: DownloadProgressPhase;
};

const DEFAULT_TIMEOUT_MS = 21_600_000;

function emit(
  onProgress: ((p: DownloadProgressUpdate) => void) | undefined,
  patch: Partial<DownloadProgressUpdate> & Pick<DownloadProgressUpdate, 'phase'>,
  base?: DownloadProgressUpdate,
) {
  const next: DownloadProgressUpdate = {
    percent: patch.percent ?? base?.percent ?? null,
    loaded: patch.loaded ?? base?.loaded ?? 0,
    total: patch.total ?? base?.total ?? null,
    indeterminate: patch.indeterminate ?? base?.indeterminate ?? true,
    phase: patch.phase,
  };
  onProgress?.(next);
  return next;
}

function formatMb(n: number): string {
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Download met zichtbare voortgang (XHR + directe “bezig”-status vóór eerste byte). */
export function downloadWithProgress(
  url: string,
  options: {
    token?: string;
    fallbackName: string;
    /** Bekende grootte uit API — voor % en sublabel vóór Content-Length. */
    expectedBytes?: number;
    onProgress?: (p: DownloadProgressUpdate) => void;
    timeoutMs?: number;
  },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    let state = emit(
      options.onProgress,
      {
        phase: 'connecting',
        percent: null,
        loaded: 0,
        total: options.expectedBytes && options.expectedBytes > 0 ? options.expectedBytes : null,
        indeterminate: true,
      },
      undefined,
    );

    const timer = window.setTimeout(() => {
      xhr.abort();
      reject(new Error('Download-timeout. Laat dit tabblad open en probeer opnieuw.'));
    }, timeoutMs);

    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    if (options.token) xhr.setRequestHeader('Authorization', `Bearer ${options.token}`);

    xhr.onprogress = (e) => {
      const total =
        e.lengthComputable && e.total > 0 ? e.total
        : state.total && state.total > 0 ? state.total
        : options.expectedBytes && options.expectedBytes > 0 ? options.expectedBytes
        : null;

      const loaded = e.loaded;
      const indeterminate = !total || total <= 0;
      const percent =
        indeterminate ? null : (
          loaded >= total ? 100 : (
            Math.min(99, Math.floor((loaded / total) * 100))
          )
        );

      state = emit(
        options.onProgress,
        {
          phase: 'downloading',
          percent,
          loaded,
          total,
          indeterminate,
        },
        state,
      );
    };

    xhr.onload = () => {
      window.clearTimeout(timer);
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(parseApiErrorBody(xhr.responseText || xhr.statusText || `HTTP ${xhr.status}`)));
        return;
      }

      const blob = xhr.response as Blob;
      if (!blob || blob.size === 0) {
        reject(new Error('Leeg bestand ontvangen.'));
        return;
      }

      let name = options.fallbackName;
      const cd = xhr.getResponseHeader('Content-Disposition');
      const m = cd?.match(/filename\*=UTF-8''([^;]+)/);
      if (m?.[1]) name = decodeURIComponent(m[1]);

      state = emit(
        options.onProgress,
        {
          phase: 'saving',
          percent: 100,
          loaded: blob.size,
          total: blob.size,
          indeterminate: false,
        },
        state,
      );

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = name;
      a.click();
      URL.revokeObjectURL(objectUrl);

      emit(
        options.onProgress,
        {
          phase: 'done',
          percent: 100,
          loaded: blob.size,
          total: blob.size,
          indeterminate: false,
        },
        state,
      );
      resolve();
    };

    xhr.onerror = () => {
      window.clearTimeout(timer);
      reject(
        new Error(
          'Netwerkonderbreking tijdens download. Laat dit tabblad open en probeer opnieuw.',
        ),
      );
    };

    xhr.onabort = () => {
      window.clearTimeout(timer);
      reject(new Error('Download geannuleerd of timeout.'));
    };

    xhr.send();
  });
}

export function downloadProgressSublabel(p: DownloadProgressUpdate): string {
  if (p.phase === 'connecting') {
    return 'Verbinding met server — bij grote films kan dit enkele minuten duren vóór de eerste %.';
  }
  if (p.phase === 'saving') {
    return 'Bestand wordt opgeslagen op je apparaat…';
  }
  if (p.total && p.total > 0) {
    return `${formatMb(p.loaded)} van ${formatMb(p.total)}`;
  }
  if (p.loaded > 0) return `${formatMb(p.loaded)} gedownload`;
  return 'Even geduld…';
}
