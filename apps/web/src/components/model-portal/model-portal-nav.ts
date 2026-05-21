export const MODEL_PORTAL_TABS = [
  { id: 'home', label: 'Home' },
  { id: 'premium', label: 'Premium' },
  { id: 'opdrachten', label: 'Opdrachten' },
  { id: 'tryout-modeshow', label: 'Try-out modeshow' },
  { id: 'modeshow-28', label: "Download foto's / film try-out" },
  { id: 'profiel', label: 'Mijn profiel / modellenfiche' },
  { id: 'portfolio', label: 'Portfolio afspraak' },
  { id: 'setkaarten', label: 'Setkaarten bestellen' },
  { id: 'opleiding', label: 'Opleidingsafspraak' },
  { id: 'historiek', label: 'Historiek' },
  { id: 'push', label: 'Pushberichten' },
  { id: 'bericht', label: 'Bericht sturen' },
  { id: 'modellen', label: 'Modellen' },
  { id: 'review-schrijven', label: 'Review schrijven' },
] as const;

export type ModelPortalTabId = (typeof MODEL_PORTAL_TABS)[number]['id'];

/** Tabs die volledige premium-toegang vereisen (badge in menu zonder premium). */
export const MODEL_PORTAL_PREMIUM_TAB_IDS: ReadonlySet<ModelPortalTabId> = new Set([
  'historiek',
  'push',
  'bericht',
]);

const TAB_IDS = new Set<string>(MODEL_PORTAL_TABS.map((t) => t.id));

export function parseModelPortalTab(raw: string | null): ModelPortalTabId {
  if (raw && TAB_IDS.has(raw)) return raw as ModelPortalTabId;
  return 'home';
}
