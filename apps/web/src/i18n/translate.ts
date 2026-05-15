import type { Locale } from './locales';
import { messagesEn } from './messages/en';
import { messagesFr } from './messages/fr';
import { messagesNl } from './messages/nl';

type MessageTree = typeof messagesNl;

const BY_LOCALE: Record<Locale, MessageTree> = {
  nl: messagesNl,
  fr: messagesFr as MessageTree,
  en: messagesEn as MessageTree,
};

function getNested(obj: unknown, path: string): string | undefined {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

export function translate(locale: Locale, key: string): string {
  const fromLocale = getNested(BY_LOCALE[locale], key);
  if (fromLocale) return fromLocale;
  const fallback = getNested(BY_LOCALE.nl, key);
  return fallback ?? key;
}
