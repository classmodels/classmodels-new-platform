/** Showroom schaal: 1 unit ≈ 1 meter */

export const ROOM = {
  wallColor: '#2a1814',
  wallDark: '#1f1210',
  floorColor: '#c4b09a',
  ceilingColor: '#1a1010',
  frameColor: '#c5a07d',
  frameDepth: 0.045,
  /** Afstand frame van muur (1–3 cm) */
  frameOffset: 0.02,
};

/** Linkermuur — schuin, alle frames parallel aan deze muur */
export const LEFT_WALL = {
  position: [-3.65, 2.72, -0.35] as [number, number, number],
  rotation: [0, 0.48, 0] as [number, number, number],
  width: 4.15,
  height: 3.65,
};

/** Achterwand (frontale muur) */
export const BACK_WALL = {
  z: -4.55,
  width: 11.5,
  height: 5.5,
  y: 2.75,
};

/** Kleine frames 4:5 */
export const SMALL_FRAME = { width: 0.76, height: 0.95 };

export const GRID = {
  cols: 4,
  rows: 2,
  gapX: 0.11,
  gapY: 0.2,
  padX: 0.14,
  padY: 0.16,
};

/** Hero 4:5 */
export const HERO_FRAME = { width: 1.38, height: 1.725 };

export const HERO = {
  position: [0.35, 2.05, BACK_WALL.z + ROOM.frameOffset] as [number, number, number],
};

export const CAMERA = {
  position: [0.15, 1.62, 6.0] as [number, number, number],
  target: [0.35, 1.65, -0.8] as [number, number, number],
  fov: 52,
};

export const TEXT_BLOCKS = {
  name: { position: [-1.55, 2.35, BACK_WALL.z + ROOM.frameOffset] as [number, number, number], width: 1.6, height: 1.8 },
  stats: { position: [2.35, 2.35, BACK_WALL.z + ROOM.frameOffset] as [number, number, number], width: 1.15, height: 1.6 },
};

export function gridCellPosition(col: number, row: number): [number, number, number] {
  const { cols, rows, gapX, gapY, padX, padY } = GRID;
  const fw = SMALL_FRAME.width;
  const fh = SMALL_FRAME.height;
  const wallW = LEFT_WALL.width;
  const wallH = LEFT_WALL.height;

  const innerW = wallW - padX * 2;
  const innerH = wallH - padY * 2;
  const totalW = cols * fw + (cols - 1) * gapX;
  const totalH = rows * fh + (rows - 1) * gapY;

  const startX = -totalW / 2 + fw / 2;
  const startY = innerH / 2 - padY - fh / 2;

  const x = startX + col * (fw + gapX);
  const y = startY - row * (fh + gapY);
  const z = ROOM.frameOffset;

  return [x, y, z];
}

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

export const DEMO_NAME = { first: 'Isabella', last: 'Van Der Meer', subtitle: 'International Model' };
