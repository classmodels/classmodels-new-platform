export const MODEL_SHEET_LABELS: Record<string, string> = {
  geboortedatum: 'Geboortedatum',
  nationaliteit: 'Nationaliteit',
  straat: 'Straat',
  postcode: 'Postcode',
  gemeente: 'Gemeente',
  land: 'Land',
  gsmModel: 'GSM (model)',
  gsmMoeder: 'GSM moeder',
  gsmVader: 'GSM vader',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  rekeningnummer: 'Rekeningnummer',
  lengte: 'Lengte (cm)',
  maat: 'Maat',
  schoenmaat: 'Schoenmaat',
  haarkleur: 'Haarkleur',
  kleurOgen: 'Kleur ogen',
  bhMaat: 'BH-maat',
  borstomtrek: 'Borstomtrek',
  confectiemaat: 'Confectiemaat',
  heupomtrek: 'Heupomtrek',
  jeansmaat: 'Jeansmaat',
  taille: 'Taille',
  overMij: 'Over mij',
  ervaringen: 'Ervaringen',
  geslacht: 'Geslacht',
  beschikbaar: 'Beschikbaar voor',
};

export function formatModelSheetRows(
  ms: Record<string, unknown> | null | undefined,
): { key: string; label: string; value: string }[] {
  if (!ms || typeof ms !== 'object') return [];
  const keys = Object.keys(ms).sort((a, b) => {
    const la = MODEL_SHEET_LABELS[a] ?? a;
    const lb = MODEL_SHEET_LABELS[b] ?? b;
    return la.localeCompare(lb, 'nl');
  });
  const out: { key: string; label: string; value: string }[] = [];
  for (const key of keys) {
    const raw = ms[key];
    let value = '—';
    if (Array.isArray(raw)) {
      value = raw.filter((x) => typeof x === 'string').join(', ') || '—';
    } else if (raw != null && typeof raw === 'object') {
      value = JSON.stringify(raw);
    } else if (raw != null) {
      value = String(raw);
    }
    out.push({
      key,
      label: MODEL_SHEET_LABELS[key] ?? key,
      value: value.length > 2000 ? `${value.slice(0, 2000)}…` : value,
    });
  }
  return out;
}
