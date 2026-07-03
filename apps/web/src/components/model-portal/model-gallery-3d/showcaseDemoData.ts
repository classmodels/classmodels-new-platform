import type { CatalogModel } from '@/components/models-catalog/ModelsCatalogGrid';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';

/** Volledig ingevuld voorbeeldmodel — werkt zonder API/database op localhost. */
export const SHOWCASE_MODEL: CatalogModel = {
  id: 'showcase-demo',
  firstName: 'Isabella',
  lastName: 'Van Der Meer',
  displayName: 'Isabella',
  age: 22,
  gender: 'vrouw',
  beschikbaar: [
    'Lingerie/Bikini',
    'Modeshows',
    'Foto opdrachten',
    'Reklame',
    'Host/hostess',
  ],
  beschikbaarSlugs: [],
  profileThumbKey: null,
  isNewface: false,
  isTryout: false,
  isInactive: false,
  isFavorite: false,
  sheet: {
    lengte: '178',
    borstomtrek: '84',
    taille: '60',
    heupomtrek: '90',
    schoenmaat: '39',
    haarkleur: 'Brown',
    kleurOgen: 'Blue',
  },
};

export const SHOWCASE_PHOTO_URLS: string[] = Array.from({ length: 8 }, (_, i) =>
  `${BASE}/images/showcase/0${i + 1}.jpg`,
);

/** Beschikbaarheden op vaste regels — geen automatische wraps midden in items. */
export function showcaseAvailLines(beschikbaar: string[]): string[] {
  const items = beschikbaar.map((b) => b.trim()).filter(Boolean);
  if (!items.length) return [];
  if (items.length <= 2) return [items.join(' - ')];
  return [items.slice(0, 2).join(' - '), items.slice(2).join(' - ')];
}
