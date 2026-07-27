/** Normaliseer tijd naar HH:mm (strip seconden / spaties). Leeg → ''. */
export function normalizeHm(raw: string): string {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return raw.trim();
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}
