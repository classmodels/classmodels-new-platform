import type { Prisma } from '@prisma/client';

/** Zichtbaarheid op modellenportaal; ontbreekt of true = tonen. */
export type BriefFrontendVisibility = {
  showBody?: boolean;
  showExtraInfo?: boolean;
  showClient?: boolean;
  showEventDate?: boolean;
  showTimes?: boolean;
  showGezochtCriteria?: boolean;
  showMainAddress?: boolean;
  showOnLocationAddress?: boolean;
  showMakeup?: boolean;
  showHair?: boolean;
  showProvisionsText?: boolean;
  showEarningsText?: boolean;
  showRemarksText?: boolean;
};

export const DEFAULT_BRIEF_VISIBILITY: Required<BriefFrontendVisibility> = {
  showBody: true,
  showExtraInfo: true,
  showClient: true,
  showEventDate: true,
  showTimes: true,
  showGezochtCriteria: true,
  showMainAddress: true,
  showOnLocationAddress: true,
  showMakeup: true,
  showHair: true,
  showProvisionsText: true,
  showEarningsText: true,
  showRemarksText: true,
};

function parseDetails(details: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return {};
  return details as Record<string, unknown>;
}

export function getBriefVisibility(details: Prisma.JsonValue | null | undefined): Required<BriefFrontendVisibility> {
  const d = parseDetails(details);
  const v = d.visibility;
  const raw =
    v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const b = (k: keyof BriefFrontendVisibility) =>
    raw[k] === false ? false : DEFAULT_BRIEF_VISIBILITY[k];
  return {
    showBody: b('showBody'),
    showExtraInfo: b('showExtraInfo'),
    showClient: b('showClient'),
    showEventDate: b('showEventDate'),
    showTimes: b('showTimes'),
    showGezochtCriteria: b('showGezochtCriteria'),
    showMainAddress: b('showMainAddress'),
    showOnLocationAddress: b('showOnLocationAddress'),
    showMakeup: b('showMakeup'),
    showHair: b('showHair'),
    showProvisionsText: b('showProvisionsText'),
    showEarningsText: b('showEarningsText'),
    showRemarksText: b('showRemarksText'),
  };
}

/** Verwijdert verborgen sleutels uit details; visibility zelf nooit naar model. */
export function filterDetailsForModel(details: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  const vis = getBriefVisibility(details);
  const d = parseDetails(details);
  const out: Record<string, unknown> = {};
  if (vis.showMainAddress && d.mainAddress) out.mainAddress = d.mainAddress;
  if (vis.showOnLocationAddress && d.onLocationAddress) out.onLocationAddress = d.onLocationAddress;
  if (vis.showMakeup && d.makeup != null) out.makeup = d.makeup;
  if (vis.showHair && d.hair != null) out.hair = d.hair;
  if (vis.showProvisionsText && d.provisionsText != null) out.provisionsText = d.provisionsText;
  if (vis.showEarningsText && d.earningsText != null) out.earningsText = d.earningsText;
  if (vis.showRemarksText && d.remarksText != null) out.remarksText = d.remarksText;
  return Object.keys(out).length ? out : null;
}

export type PortalBriefRow = {
  body: string;
  extraInfo: string | null;
  eventDate: Date | null;
  startTime: string | null;
  endTime: string | null;
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
  details: Prisma.JsonValue | null;
  client: {
    id: string;
    email: string;
    companyName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
};

/** Strip velden die het bureau niet op het modellenportaal wil tonen. */
export function sanitizeBriefForModelPortal<B extends PortalBriefRow>(
  b: B,
): B & { portalDisplay?: { hideGezochtCriteria: boolean }; details: Prisma.JsonValue | null } {
  const vis = getBriefVisibility(b.details);
  const hideGeo = !vis.showGezochtCriteria;
  const base = {
    ...b,
    body: vis.showBody ? b.body : '',
    extraInfo: vis.showExtraInfo ? b.extraInfo : null,
    eventDate: vis.showEventDate ? b.eventDate : null,
    startTime: vis.showTimes ? b.startTime : null,
    endTime: vis.showTimes ? b.endTime : null,
    client: vis.showClient
      ? b.client
      : {
          ...b.client,
          email: '',
          companyName: 'Class-Models',
          firstName: null,
          lastName: null,
        },
    details: filterDetailsForModel(b.details) as Prisma.JsonValue,
  };
  if (!hideGeo) return base as B & { details: Prisma.JsonValue | null };
  return {
    ...base,
    wantedMen: null,
    wantedWomen: null,
    wantedChildren: null,
    wantedTeenagers: null,
    ageManFrom: null,
    ageManTo: null,
    ageWomanFrom: null,
    ageWomanTo: null,
    ageChildFrom: null,
    ageChildTo: null,
    ageTeenFrom: null,
    ageTeenTo: null,
    portalDisplay: { hideGezochtCriteria: true },
  } as B & { portalDisplay: { hideGezochtCriteria: boolean }; details: Prisma.JsonValue | null };
}
