/** Begrenst trage externe API's (geocoding, kaart, OSRM). */
export async function withFetchTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function fetchTimeoutMs(envKey: string, defaultMs: number): number {
  const n = parseInt(process.env[envKey] || String(defaultMs), 10);
  return Number.isFinite(n) && n > 0 ? n : defaultMs;
}
