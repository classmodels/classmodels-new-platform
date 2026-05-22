import { buildKnownContentKeys } from '@/lib/known-content-keys';
import { PORTFOLIO_CONTENT_FIELDS } from '@/lib/portfolio-content-fields';

export type ContentSection = {
  id: string;
  title: string;
  match: (key: string) => boolean;
};

const MODEL_PREFIX = 'portal.model.';

export const CONTENT_SECTIONS: ContentSection[] = [
  { id: 'begin', title: 'Startpagina (inloggen)', match: (k) => k.startsWith('begin.') },
  { id: 'header', title: 'Website · menu bovenaan', match: (k) => k.startsWith('site.header.') },
  { id: 'reviews', title: 'Publieke reviews-pagina', match: (k) => k.startsWith('home.') },
  {
    id: 'model-portfolio',
    title: 'Modelportaal · Portfolio afspraak',
    match: (k) => k.startsWith(`${MODEL_PREFIX}portfolio.`),
  },
  {
    id: 'model-home',
    title: 'Modelportaal · Home',
    match: (k) => k.startsWith(`${MODEL_PREFIX}home.`),
  },
  {
    id: 'model-nav',
    title: 'Modelportaal · Menu (tabbladen)',
    match: (k) => k.startsWith(`${MODEL_PREFIX}nav.`),
  },
  {
    id: 'model-welcome',
    title: 'Modelportaal · Welkom & premium',
    match: (k) =>
      k.startsWith(`${MODEL_PREFIX}hero.`) ||
      k.startsWith(`${MODEL_PREFIX}sidebar.`) ||
      k.startsWith(`${MODEL_PREFIX}premium.`),
  },
  {
    id: 'model-other',
    title: 'Modelportaal · Overige teksten',
    match: (k) =>
      k.startsWith(MODEL_PREFIX) &&
      !k.startsWith(`${MODEL_PREFIX}portfolio.`) &&
      !k.startsWith(`${MODEL_PREFIX}home.`) &&
      !k.startsWith(`${MODEL_PREFIX}nav.`) &&
      !k.startsWith(`${MODEL_PREFIX}hero.`) &&
      !k.startsWith(`${MODEL_PREFIX}sidebar.`) &&
      !k.startsWith(`${MODEL_PREFIX}premium.`),
  },
  { id: 'guest', title: 'Gastportaal', match: (k) => k.startsWith('portal.guest.') },
  { id: 'client', title: 'Klantportaal', match: (k) => k.startsWith('portal.client.') },
];

const LABEL_OVERRIDES: Record<string, string> = Object.fromEntries(
  PORTFOLIO_CONTENT_FIELDS.map((f) => [f.key, f.label]),
);

/** Leesbare titel bij een CMS-sleutel (geen technisch jargon in de backsite). */
export function contentFieldLabel(key: string): string {
  if (LABEL_OVERRIDES[key]) return LABEL_OVERRIDES[key];
  const parts = key.split('.');
  const last = parts[parts.length - 1] ?? key;
  const human = last
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\.\d+/g, (m) => ` (${parseInt(m.slice(1), 10) + 1})`)
    .trim();
  const area =
    key.startsWith('portal.guest.page.')
      ? 'Gastpagina'
      : key.startsWith('portal.guest.')
        ? 'Gastportaal'
        : key.startsWith('portal.model.')
          ? 'Model'
          : key.startsWith('portal.client.')
            ? 'Klant'
            : key.startsWith('begin.')
              ? 'Start'
              : key.startsWith('site.')
                ? 'Site'
                : '';
  return area ? `${area} · ${human}` : human;
}

export function groupContentKeys(keys: string[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const s of CONTENT_SECTIONS) grouped.set(s.id, []);
  const other: string[] = [];

  for (const key of keys) {
    const section = CONTENT_SECTIONS.find((s) => s.match(key));
    if (section) grouped.get(section.id)!.push(key);
    else other.push(key);
  }

  for (const [, list] of grouped) list.sort((a, b) => a.localeCompare(b, 'nl'));
  other.sort((a, b) => a.localeCompare(b, 'nl'));
  if (other.length) grouped.set('other', other);
  return grouped;
}

export function allEditableContentKeys(): string[] {
  return buildKnownContentKeys();
}
