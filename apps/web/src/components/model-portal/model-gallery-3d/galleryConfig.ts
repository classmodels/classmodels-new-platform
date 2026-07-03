import type { GridLayout, Quad } from '@/components/model-portal/model-gallery-3d/quadTransform';

/** Alle coördinaten in px op de basismaat 1024 × 576 (= verhouding achtergrond foto 20). */
export const BASE_W = 1024;
export const BASE_H = 576;

/**
 * Schuine linkermuur — tl→tr ligt op de LED-lichtbalk (gemeten op achtergrondfoto).
 * Bovenste fotorij loopt evenwijdig via vaste padV.
 */
export const LEFT_WALL_QUAD: Quad = {
  tl: [64, 132],
  tr: [312, 106],
  br: [310, 440],
  bl: [68, 395],
};

export const GRID: GridLayout = {
  cols: 4,
  rows: 2,
  padU: 0.035,
  padV: 0.016,
  gapU: 0.022,
  gapV: 0.1,
};

/** Hoofdfoto — bovenkant vast; rechteronder iets lager t.o.v. plint. */
export const HERO_QUAD: Quad = {
  tl: [560, 112],
  tr: [780, 98],
  br: [780, 450],
  bl: [560, 442],
};

/** Tekst op middenwand (tussen foto's en hero). */
export const TEXT = {
  nameFirst: { x: 326, y: 196, size: 15, tracking: 0.16 },
  nameLast: { x: 326, y: 218, size: 19, tracking: 0.06 },
  subtitle: { x: 327, y: 248, size: 7.5, tracking: 0.2 },
  divider: { x: 327, y: 261, w: 116 },
  availTitle: { x: 327, y: 276, size: 7.5, tracking: 0.16 },
  availList: { x: 327, y: 292, size: 7.5, line: 15, tracking: 0.1 },
  statsTitle: { x: 905, y: 150, size: 12, tracking: 0.16 },
  statsList: { labelX: 905, valueX: 1010, y: 182, size: 9, line: 22, tracking: 0.1 },
};

export const AVAIL = ['Lingerie', 'Modeshows', 'Editorial', 'Commercial', 'Campaigns', 'Brand Collaborations'];

export const STATS: [string, string][] = [
  ['Length', '178 cm'],
  ['Bust', '84 cm'],
  ['Waist', '62 cm'],
  ['Hips', '90 cm'],
  ['Shoes', '40'],
  ['Hair', 'Brown'],
  ['Eyes', 'Hazel'],
];
