/** Normaliseer login (e-mail of telefoon) en telefoon voor vergelijking. */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function phoneDigits(input: string): string {
  return input.replace(/\D/g, '');
}

/** Varianten voor lookup (BE: 0470… ↔ 32470…). */
export function phoneLookupVariants(input: string): string[] {
  const d = phoneDigits(input);
  if (!d) return [];
  const out = new Set<string>([d]);
  if (d.startsWith('0') && d.length >= 9) out.add(`32${d.slice(1)}`);
  if (d.startsWith('32') && d.length >= 10) out.add(`0${d.slice(2)}`);
  if (d.length >= 9) out.add(d.slice(-9));
  return [...out];
}

export function isEmailLike(input: string): boolean {
  return input.includes('@');
}
