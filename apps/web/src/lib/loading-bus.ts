/** Sitebrede laad-indicator (geregistreerd door LoadingProvider). */

type Handlers = {
  begin: (label?: string) => void;
  end: () => void;
};

let handlers: Handlers | null = null;

export function registerLoadingHandlers(h: Handlers | null) {
  handlers = h;
}

export function loadingBegin(label?: string) {
  handlers?.begin(label);
}

export function loadingEnd() {
  handlers?.end();
}

export async function withLoading<T>(label: string | undefined, fn: () => Promise<T>): Promise<T> {
  loadingBegin(label);
  try {
    return await fn();
  } finally {
    loadingEnd();
  }
}
