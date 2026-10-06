/** Eenmalige homepage-actie Open Modellendag — zet op false na 11 oktober. */
export const OPEN_MODELLENDAG_ENABLED = true;

export const OPEN_MODELLENDAG_SLOTS = ['11:00', '13:00', '15:00', '17:00'] as const;
export type OpenModellendagSlot = (typeof OPEN_MODELLENDAG_SLOTS)[number];

export const OPEN_MODELLENDAG_POSTER = '/nieuw/open-modellendag-poster.jpg';
export const OPEN_MODELLENDAG_DATE_LABEL = 'zondag 11 oktober';
export const OPEN_MODELLENDAG_VENUE = 'Provinciebaan 3, 2235 Hulshout';
