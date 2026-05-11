export const MODEL_PORTAL_TABS = [
  { id: 'home', label: 'Home' },
  { id: 'opdrachten', label: 'Opdrachten' },
  { id: 'profiel', label: 'Mijn profiel / modellenfiche' },
  { id: 'portfolio', label: 'Portfolio afspraak' },
  { id: 'opleiding', label: 'Opleidingsafspraak' },
  { id: 'historiek', label: 'Historiek' },
  { id: 'push', label: 'Pushberichten' },
  { id: 'bericht', label: 'Bericht sturen' },
] as const;

export type ModelPortalTabId = (typeof MODEL_PORTAL_TABS)[number]['id'];

const TAB_IDS = new Set<string>(MODEL_PORTAL_TABS.map((t) => t.id));

export function parseModelPortalTab(raw: string | null): ModelPortalTabId {
  if (raw && TAB_IDS.has(raw)) return raw as ModelPortalTabId;
  return 'home';
}
