import type { Prisma } from '@prisma/client';

export type BriefForEligibility = {
  wantedMen: number | null;
  wantedWomen: number | null;
  wantedChildren: number | null;
  wantedTeenagers: number | null;
  ageManFrom: number | null;
  ageManTo: number | null;
  ageWomanFrom: number | null;
  ageWomanTo: number | null;
  ageChildFrom: number | null;
  ageChildTo: number | null;
  ageTeenFrom: number | null;
  ageTeenTo: number | null;
};

function ageFromGeboorteYmd(ymd: string): number | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  const bd = new Date(y, m - 1, d);
  if (Number.isNaN(bd.getTime())) return null;
  const t = new Date();
  let a = t.getFullYear() - bd.getFullYear();
  const md = t.getMonth() - bd.getMonth();
  if (md < 0 || (md === 0 && t.getDate() < bd.getDate())) a--;
  return a >= 0 ? a : null;
}

function parseGeslacht(sheet: Record<string, unknown> | null): { man: boolean; vrouw: boolean } {
  if (!sheet) return { man: false, vrouw: false };
  const g = sheet.geslacht;
  if (!Array.isArray(g)) return { man: false, vrouw: false };
  const arr = g.filter((x): x is string => typeof x === 'string').map((x) => x.toLowerCase());
  return {
    man: arr.includes('man'),
    vrouw: arr.includes('vrouw'),
  };
}

function ageInRange(age: number | null, from: number | null, to: number | null): boolean {
  if (age == null) return false;
  const lo = from ?? 0;
  const hi = to ?? 150;
  return age >= lo && age <= hi;
}

/** Geen enkele “gezocht”-restrictie actief → iedereen in aanmerking. */
export function briefHasNoActiveCriteria(b: BriefForEligibility): boolean {
  const wm = b.wantedMen ?? 0;
  const ww = b.wantedWomen ?? 0;
  const wc = b.wantedChildren ?? 0;
  const wt = b.wantedTeenagers ?? 0;
  return wm <= 0 && ww <= 0 && wc <= 0 && wt <= 0;
}

export function modelAgeFromSheet(modelSheet: Prisma.JsonValue | null | undefined): number | null {
  if (!modelSheet || typeof modelSheet !== 'object' || Array.isArray(modelSheet)) return null;
  const gd = (modelSheet as Record<string, unknown>).geboortedatum;
  return typeof gd === 'string' ? ageFromGeboorteYmd(gd) : null;
}

/**
 * Model komt in aanmerking als minstens één actieve “gezocht”-categorie past
 * (man/vrouw/kind/tiener + leeftijdsbereik waar ingevuld).
 */
export function computeBriefEligibility(
  brief: BriefForEligibility,
  modelSheet: Prisma.JsonValue | null | undefined,
): { eligible: boolean; reason: string } {
  if (briefHasNoActiveCriteria(brief)) {
    return { eligible: true, reason: 'Geen specifieke profielen ingesteld — iedereen komt in aanmerking.' };
  }

  const sheet =
    modelSheet && typeof modelSheet === 'object' && !Array.isArray(modelSheet)
      ? (modelSheet as Record<string, unknown>)
      : null;
  const { man, vrouw } = parseGeslacht(sheet);
  const age = modelAgeFromSheet(modelSheet);

  const matches: string[] = [];

  const manNeedsAge = brief.ageManFrom != null || brief.ageManTo != null;
  const wm = brief.wantedMen ?? 0;
  if (wm > 0 && man) {
    if (!manNeedsAge || (age != null && ageInRange(age, brief.ageManFrom, brief.ageManTo))) {
      matches.push('man');
    }
  }

  const womanNeedsAge = brief.ageWomanFrom != null || brief.ageWomanTo != null;
  const ww = brief.wantedWomen ?? 0;
  if (ww > 0 && vrouw) {
    if (!womanNeedsAge || (age != null && ageInRange(age, brief.ageWomanFrom, brief.ageWomanTo))) {
      matches.push('vrouw');
    }
  }

  const wc = brief.wantedChildren ?? 0;
  if (wc > 0 && age != null && ageInRange(age, brief.ageChildFrom, brief.ageChildTo)) {
    matches.push('kind');
  }

  const wt = brief.wantedTeenagers ?? 0;
  if (wt > 0 && age != null && ageInRange(age, brief.ageTeenFrom, brief.ageTeenTo)) {
    matches.push('tiener');
  }

  if (matches.length) {
    return { eligible: true, reason: `Past bij: ${matches.join(', ')}.` };
  }

  if (age == null) {
    return {
      eligible: false,
      reason: 'Vul je geboortedatum (JJJJ-MM-DD) en geslacht in je modellenfiche aan om automatisch te matchen.',
    };
  }
  return { eligible: false, reason: 'Je profiel past niet bij de ingestelde criteria voor deze opdracht.' };
}
