import { parseApiErrorBody } from '@/lib/api';

export type DownloadProgressUpdate = {
  percent: number | null;
  loaded: number;
  total: number | null;
  indeterminate: boolean;
};

export async function downloadWithProgress(
  url: string,
  options: {
    token?: string;
    fallbackName: string;
    onProgress?: (p: DownloadProgressUpdate) => void;
    timeoutMs?: number;
  },
): Promise<void> {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 21_600_000,
  );

  try {
    const headers: Record<string, string> = {};
    if (options.token) headers.Authorization = `Bearer ${options.token}`;

    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(parseApiErrorBody(t || res.statusText));
    }

    const totalHeader = res.headers.get('Content-Length');
    const total = totalHeader ? parseInt(totalHeader, 10) : null;
    const indeterminate = !total || !Number.isFinite(total) || total <= 0;

    let name = options.fallbackName;
    const cd = res.headers.get('Content-Disposition');
    const m = cd?.match(/filename\*=UTF-8''([^;]+)/);
    if (m?.[1]) name = decodeURIComponent(m[1]);

    const body = res.body;
    if (!body) {
      const blob = await res.blob();
      triggerSave(blob, name);
      options.onProgress?.({ percent: 100, loaded: blob.size, total: blob.size, indeterminate: false });
      return;
    }

    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;

    options.onProgress?.({ percent: indeterminate ? null : 0, loaded: 0, total, indeterminate });

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loaded += value.length;
        const percent =
          indeterminate ? null : (
            loaded >= total! ? 100 : (
              Math.min(99, Math.floor((loaded / total!) * 100))
            )
          );
        options.onProgress?.({ percent, loaded, total, indeterminate });
      }
    }

    const blob = new Blob(chunks as BlobPart[]);
    options.onProgress?.({
      percent: 100,
      loaded: blob.size,
      total: total ?? blob.size,
      indeterminate: false,
    });
    triggerSave(blob, name);
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Download-timeout. Laat dit tabblad open en probeer opnieuw.');
    }
    throw e;
  } finally {
    window.clearTimeout(timeout);
  }
}

function triggerSave(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
