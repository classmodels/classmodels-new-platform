'use client';

import { LOCALES, type Locale } from '@/i18n/locales';
import { useI18n } from '@/i18n/context';

type Props = {
  /** Donkere achtergrond (startpagina) */
  variant?: 'light' | 'dark';
  className?: string;
};

export function LanguageSwitcher({ variant = 'light', className = '' }: Props) {
  const { locale, setLocale, localeLabels } = useI18n();

  const base =
    variant === 'dark'
      ? 'border-white/25 bg-black/30 text-white'
      : 'border-line bg-white text-ink';

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-lg border p-0.5 text-xs font-medium ${base} ${className}`}
      role="group"
      aria-label="Language"
    >
      {LOCALES.map((loc) => {
        const active = locale === loc;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => setLocale(loc as Locale)}
            className={`rounded-md px-2 py-1 transition ${
              active
                ? variant === 'dark'
                  ? 'bg-white text-ink'
                  : 'bg-burgundy text-white'
                : variant === 'dark'
                  ? 'text-white/80 hover:text-white'
                  : 'text-muted hover:text-ink'
            }`}
          >
            {localeLabels[loc]}
          </button>
        );
      })}
    </div>
  );
}
