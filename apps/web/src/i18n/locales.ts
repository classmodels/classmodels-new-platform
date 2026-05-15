export const LOCALES = ['nl', 'fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'nl';

export const LOCALE_LABELS: Record<Locale, string> = {
  nl: 'NL',
  fr: 'FR',
  en: 'EN',
};

export function isLocale(v: string): v is Locale {
  return (LOCALES as readonly string[]).includes(v);
}
