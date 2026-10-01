/** Model-worden: pakketlabels + mailteksten (bevestiging / herinnering / opvolging). */

export type ModelWordenPackage = 'testshoot_intake' | 'intake_only';

export function detectModelWordenPackage(
  fields: Record<string, unknown> | null | undefined,
): ModelWordenPackage | null {
  if (!fields || typeof fields !== 'object') return null;
  const raw = String(fields.pakket ?? fields.package ?? fields.opmerkingen ?? '')
    .trim()
    .toLowerCase();
  if (!raw) return null;
  if (raw.includes('testshoot') || raw.includes('fotoshoot') || raw.includes('foto')) {
    return 'testshoot_intake';
  }
  if (raw.includes('intake')) return 'intake_only';
  return null;
}

export function packageLabelFromFields(
  fields: Record<string, unknown> | null | undefined,
): string | null {
  const pkg = detectModelWordenPackage(fields);
  if (pkg === 'testshoot_intake') return 'Gratis testshoot + intake-gesprek';
  if (pkg === 'intake_only') return 'Alleen intake-gesprek';
  return null;
}

/** Admin-lijst / filters: oude gastenagenda’s vallen onder Model worden. */
export const LEGACY_GUEST_AGENDA_SLUGS = [
  'intake-gesprek',
  'casting',
  'gratis-fotoshoot',
] as const;

export const MODEL_WORDEN_FAMILY_SLUGS = [
  'model-worden',
  ...LEGACY_GUEST_AGENDA_SLUGS,
] as const;

export function isModelWordenFamilySlug(slug: string): boolean {
  return (MODEL_WORDEN_FAMILY_SLUGS as readonly string[]).includes(slug);
}

export function isLegacyGuestAgendaSlug(slug: string): boolean {
  return (LEGACY_GUEST_AGENDA_SLUGS as readonly string[]).includes(slug);
}

/** Virtuele sjabloon-targets i.p.v. aparte legacy-agenda’s. */
export const MODEL_WORDEN_PKG_TARGET_TESTSHOOT = 'model-worden:testshoot_intake';
export const MODEL_WORDEN_PKG_TARGET_INTAKE = 'model-worden:intake_only';

export const MODEL_WORDEN_PACKAGE_TARGET_KEYS = [
  MODEL_WORDEN_PKG_TARGET_TESTSHOOT,
  MODEL_WORDEN_PKG_TARGET_INTAKE,
] as const;

export function isModelWordenPackageTargetKey(slug: string): boolean {
  return (MODEL_WORDEN_PACKAGE_TARGET_KEYS as readonly string[]).includes(slug);
}

/** Effectief pakket voor matching (ook legacy agenda-slugs). */
export function effectiveModelWordenPackage(
  calendarSlug: string,
  fields: Record<string, unknown> | null | undefined,
): ModelWordenPackage | null {
  if (calendarSlug === 'gratis-fotoshoot') return 'testshoot_intake';
  if (calendarSlug === 'intake-gesprek') return 'intake_only';
  if (calendarSlug === 'casting') return null;
  if (calendarSlug === 'model-worden') return detectModelWordenPackage(fields);
  return null;
}

function parseTemplateSlugList(templateSlugsRaw: unknown): string[] {
  let v: unknown = templateSlugsRaw;
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return [];
    try {
      v = JSON.parse(t) as unknown;
    } catch {
      return [];
    }
  }
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return [];
}

/**
 * Of een notificatie-sjabloon geldt voor deze boeking.
 * Ondersteunt gewone agenda-slugs én `model-worden:testshoot_intake` / `model-worden:intake_only`.
 */
export function templateAppliesToBooking(
  templateSlugsRaw: unknown,
  calendarSlug: string,
  fields?: Record<string, unknown> | null,
): boolean {
  const slugs = parseTemplateSlugList(templateSlugsRaw);
  if (!slugs.length) return false;

  if (slugs.includes(calendarSlug)) return true;

  if (!isModelWordenFamilySlug(calendarSlug)) return false;

  if (slugs.includes('model-worden')) return true;

  const pkg = effectiveModelWordenPackage(calendarSlug, fields ?? null);
  if (pkg === 'testshoot_intake') {
    return (
      slugs.includes(MODEL_WORDEN_PKG_TARGET_TESTSHOOT) || slugs.includes('gratis-fotoshoot')
    );
  }
  if (pkg === 'intake_only') {
    return slugs.includes(MODEL_WORDEN_PKG_TARGET_INTAKE) || slugs.includes('intake-gesprek');
  }
  // model-worden zonder pakket / casting
  if (calendarSlug === 'model-worden' || calendarSlug === 'casting') {
    return (
      slugs.includes(MODEL_WORDEN_PKG_TARGET_TESTSHOOT) ||
      slugs.includes(MODEL_WORDEN_PKG_TARGET_INTAKE) ||
      slugs.includes('casting')
    );
  }
  return false;
}

export function resolveMailCalendarTitle(
  calendarSlug: string,
  calendarTitle: string,
  fields: Record<string, unknown> | null | undefined,
): string {
  if (calendarSlug === 'model-worden' || calendarSlug === 'gratis-fotoshoot') {
    return packageLabelFromFields(fields) ?? (calendarSlug === 'model-worden' ? 'Model worden' : calendarTitle);
  }
  if (calendarSlug === 'intake-gesprek') {
    return packageLabelFromFields(fields) ?? 'Alleen intake-gesprek';
  }
  return calendarTitle;
}

/** Korte label voor admin-boekingenlijst. */
export function bookingAgendaDisplayLabel(
  calendarSlug: string,
  calendarTitle: string,
  fields: Record<string, unknown> | null | undefined,
): string {
  if (calendarSlug === 'model-worden') {
    const pkg = detectModelWordenPackage(fields);
    if (pkg === 'testshoot_intake') return 'Model worden · Testshoot + intake';
    if (pkg === 'intake_only') return 'Model worden · Alleen intake';
    return 'Model worden';
  }
  if (calendarSlug === 'gratis-fotoshoot') return 'Model worden · Testshoot + intake';
  if (calendarSlug === 'intake-gesprek') return 'Model worden · Alleen intake';
  if (calendarSlug === 'casting') return 'Model worden · Casting';
  return calendarTitle;
}

const PARENT_NOTE_HTML =
  '<p style="margin:16px 0 0;padding:12px 14px;border:1px solid #e4e4e7;border-radius:6px;background:#fafafa;font-size:13px;line-height:1.5;color:#3f3f46;text-align:left;"><strong>Belangrijk:</strong> bent u minderjarig, student of thuiswonend, dan is de aanwezigheid van een ouder of voogd bij de afspraak verplicht.</p>';

const PARENT_NOTE_PLAIN =
  'Belangrijk: bent u minderjarig, student of thuiswonend, dan is de aanwezigheid van een ouder of voogd bij de afspraak verplicht.';

const TESTSHOOT_DETAILS_HTML = `<p style="margin:0 0 16px;text-align:left;font-size:14px;line-height:1.55;color:#3f3f46;">
<strong>Wat mag u verwachten bij de gratis testshoot?</strong><br/>
De sessie (testshoot + kort intake-gesprek) duurt ongeveer <strong>40 minuten</strong> in totaal.
Neem <strong>één outfitje</strong> mee waarin u zich goed voelt.
Make-up mag, maar is <strong>niet verplicht</strong> — we werken graag met een natuurlijke look.
</p>`;

const TESTSHOOT_DETAILS_PLAIN =
  'Wat mag u verwachten bij de gratis testshoot? De sessie (testshoot + kort intake-gesprek) duurt ongeveer 40 minuten in totaal. Neem één outfitje mee. Make-up mag, maar is niet verplicht.';

export function modelWordenConfirmationIntroHtml(pkg: ModelWordenPackage | null): string {
  if (pkg === 'testshoot_intake') {
    return 'Uw afspraak voor een <strong>gratis testshoot + intake-gesprek</strong> is ingepland. Hieronder vindt u de gegevens.';
  }
  return 'Uw afspraak voor een <strong>alleen intake-gesprek</strong> is ingepland. Hieronder vindt u de gegevens.';
}

export function modelWordenConfirmationSubject(pkg: ModelWordenPackage | null): string {
  if (pkg === 'testshoot_intake') {
    return 'Bevestiging: gratis testshoot + intake-gesprek — Class Models';
  }
  return 'Bevestiging: alleen intake-gesprek — Class Models';
}

/** Extra blokken onder de standaard intro (vóór de TYPE-tabel blijft via template). */
export function modelWordenExtraBlocksHtml(pkg: ModelWordenPackage | null): string {
  const parts: string[] = [];
  if (pkg === 'testshoot_intake') parts.push(TESTSHOOT_DETAILS_HTML);
  parts.push(PARENT_NOTE_HTML);
  return parts.join('\n');
}

export function modelWordenExtraBlocksPlain(pkg: ModelWordenPackage | null): string {
  const parts: string[] = [];
  if (pkg === 'testshoot_intake') parts.push(TESTSHOOT_DETAILS_PLAIN);
  parts.push(PARENT_NOTE_PLAIN);
  return parts.join('\n\n');
}

export function modelWordenReminderSubject(pkg: ModelWordenPackage | null): string {
  if (pkg === 'testshoot_intake') {
    return 'Herinnering: gratis testshoot + intake-gesprek — Class Models';
  }
  return 'Herinnering: alleen intake-gesprek — Class Models';
}

export function modelWordenFollowupSubject(pkg: ModelWordenPackage | null): string {
  if (pkg === 'testshoot_intake') {
    return 'Opvolging na uw testshoot + intake — Class Models';
  }
  return 'Opvolging na uw intake-gesprek — Class Models';
}

export function modelWordenReminderIntroHtml(pkg: ModelWordenPackage | null): string {
  if (pkg === 'testshoot_intake') {
    return 'Herinnering: u heeft binnenkort een <strong>gratis testshoot + intake-gesprek</strong> bij Class-Models.';
  }
  return 'Herinnering: u heeft binnenkort een <strong>alleen intake-gesprek</strong> bij Class-Models.';
}

export function modelWordenFollowupIntroHtml(pkg: ModelWordenPackage | null): string {
  if (pkg === 'testshoot_intake') {
    return 'Bedankt voor uw bezoek voor de <strong>gratis testshoot + intake-gesprek</strong>. Hierbij een korte opvolging van Class-Models.';
  }
  return 'Bedankt voor uw <strong>intake-gesprek</strong>. Hierbij een korte opvolging van Class-Models.';
}
