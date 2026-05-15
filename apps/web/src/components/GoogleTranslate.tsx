'use client';

import { useCallback, useEffect, useState } from 'react';

export type GoogleTranslateLang = 'nl' | 'fr' | 'en';

const LABELS: Record<GoogleTranslateLang, string> = { nl: 'NL', fr: 'FR', en: 'EN' };

function readLangFromCookie(): GoogleTranslateLang {
  if (typeof document === 'undefined') return 'nl';
  const m = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
  const val = decodeURIComponent(m?.[1] || '');
  if (val.includes('/fr')) return 'fr';
  if (val.includes('/en')) return 'en';
  return 'nl';
}

function setGoogleTranslateLang(lang: GoogleTranslateLang) {
  const host = window.location.hostname;
  const value = lang === 'nl' ? '' : `/nl/${lang}`;
  const base = `googtrans=${encodeURIComponent(value)};path=/`;
  document.cookie = base;
  if (host && !host.includes('localhost')) {
    document.cookie = `${base};domain=.${host}`;
    document.cookie = `${base};domain=${host}`;
  }
  window.location.reload();
}

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
  }
}

function loadGoogleTranslateScript() {
  if (document.getElementById('google-translate-script')) return;
  window.googleTranslateElementInit = () => {
    const g = (window as unknown as { google?: { translate?: { TranslateElement: new (
      opts: { pageLanguage: string; includedLanguages: string; autoDisplay: boolean },
      id: string,
    ) => void } } }).google;
    if (!g?.translate?.TranslateElement) return;
    new g.translate.TranslateElement(
      { pageLanguage: 'nl', includedLanguages: 'nl,fr,en', autoDisplay: false },
      'google_translate_element_hidden',
    );
  };
  const s = document.createElement('script');
  s.id = 'google-translate-script';
  s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  s.async = true;
  document.body.appendChild(s);
}

type Props = {
  variant?: 'light' | 'dark';
  className?: string;
};

/**
 * Gratis Google Translate (zoals veel WordPress-plugins).
 * Frontend: bezoeker kiest NL/FR/EN → hele pagina wordt vertaald.
 * CMS-teksten in het Nederlands worden automatisch mee vertaald bij weergave.
 */
export function GoogleTranslate({ variant = 'light', className = '' }: Props) {
  const [active, setActive] = useState<GoogleTranslateLang>('nl');

  useEffect(() => {
    loadGoogleTranslateScript();
    setActive(readLangFromCookie());
  }, []);

  const pick = useCallback((lang: GoogleTranslateLang) => {
    if (lang === active) return;
    setGoogleTranslateLang(lang);
  }, [active]);

  const base =
    variant === 'dark'
      ? 'border-white/25 bg-black/30 text-white'
      : 'border-line bg-white text-ink';

  return (
    <>
      <div id="google_translate_element_hidden" className="hidden" aria-hidden />
      <div
        className={`inline-flex items-center gap-0.5 rounded-lg border p-0.5 text-xs font-medium ${base} ${className}`}
        role="group"
        aria-label="Taal / Language"
      >
        {(['nl', 'fr', 'en'] as const).map((lang) => {
          const isActive = active === lang;
          return (
            <button
              key={lang}
              type="button"
              onClick={() => pick(lang)}
              className={`rounded-md px-2 py-1 transition ${
                isActive
                  ? variant === 'dark'
                    ? 'bg-white text-ink'
                    : 'bg-burgundy text-white'
                  : variant === 'dark'
                    ? 'text-white/80 hover:text-white'
                    : 'text-muted hover:text-ink'
              }`}
            >
              {LABELS[lang]}
            </button>
          );
        })}
      </div>
    </>
  );
}
