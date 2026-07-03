/**
 * Berekent een CSS `matrix3d(...)` die een bron-rechthoek (0,0)-(SW,SH)
 * exact op een doel-vierhoek (4 hoekpunten) legt. Hiermee leggen we foto's
 * pixel-perfect op een schuine muur ("corner-pinning" / homografie).
 */

export type Quad = {
  tl: [number, number];
  tr: [number, number];
  br: [number, number];
  bl: [number, number];
};

function adj(m: number[]): number[] {
  return [
    m[4] * m[8] - m[5] * m[7],
    m[2] * m[7] - m[1] * m[8],
    m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8],
    m[0] * m[8] - m[2] * m[6],
    m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6],
    m[1] * m[6] - m[0] * m[7],
    m[0] * m[4] - m[1] * m[3],
  ];
}

function multmm(a: number[], b: number[]): number[] {
  const c = new Array(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let cij = 0;
      for (let k = 0; k < 3; k++) cij += a[3 * i + k] * b[3 * k + j];
      c[3 * i + j] = cij;
    }
  }
  return c;
}

function multmv(m: number[], v: number[]): number[] {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

function basisToPoints(
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  x4: number, y4: number,
): number[] {
  const m = [x1, x2, x3, y1, y2, y3, 1, 1, 1];
  const v = multmv(adj(m), [x4, y4, 1]);
  return multmm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
}

function general2DProjection(
  s: number[],
  d: number[],
): number[] {
  const sb = basisToPoints(s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7]);
  const db = basisToPoints(d[0], d[1], d[2], d[3], d[4], d[5], d[6], d[7]);
  return multmm(db, adj(sb));
}

/**
 * @param sw bronbreedte (px van het element)
 * @param sh bronhoogte (px van het element)
 * @param quad doel-vierhoek in px (zelfde coördinatenstelsel)
 * @returns CSS transform string; gebruik met transform-origin: 0 0
 */
export function quadMatrix3d(sw: number, sh: number, quad: Quad): string {
  const s = [0, 0, sw, 0, sw, sh, 0, sh];
  const d = [
    quad.tl[0], quad.tl[1],
    quad.tr[0], quad.tr[1],
    quad.br[0], quad.br[1],
    quad.bl[0], quad.bl[1],
  ];
  const t = general2DProjection(s, d);
  for (let i = 0; i < 9; i++) t[i] = t[i] / t[8];
  const m = [
    t[0], t[3], 0, t[6],
    t[1], t[4], 0, t[7],
    0, 0, 1, 0,
    t[2], t[5], 0, t[8],
  ];
  return `matrix3d(${m.join(',')})`;
}

function lerpPt(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Punt op muurvlak (u,v ∈ 0..1). */
export function pointOnQuad(q: Quad, u: number, v: number): [number, number] {
  const top = lerpPt(q.tl, q.tr, u);
  const bot = lerpPt(q.bl, q.br, u);
  return lerpPt(top, bot, v);
}

export type GridLayout = {
  cols: number;
  rows: number;
  padU: number;
  padV: number;
  gapU: number;
  gapV: number;
};

/** Vierhoek van één fotocel op het muurvlak — elke foto krijgt eigen perspectief. */
export function cellQuadOnWall(wall: Quad, col: number, row: number, grid: GridLayout): Quad {
  const { cols, rows, padU, padV, gapU, gapV } = grid;
  const cellU = (1 - 2 * padU - (cols - 1) * gapU) / cols;
  const cellV = (1 - 2 * padV - (rows - 1) * gapV) / rows;

  const u0 = padU + col * (cellU + gapU);
  const u1 = u0 + cellU;
  const v0 = padV + row * (cellV + gapV);
  const v1 = v0 + cellV;

  return {
    tl: pointOnQuad(wall, u0, v0),
    tr: pointOnQuad(wall, u1, v0),
    br: pointOnQuad(wall, u1, v1),
    bl: pointOnQuad(wall, u0, v1),
  };
}

/** Canonieke celgrootte (2:3) voor matrix3d-bronrechthoek. */
export const CELL_W = 100;
export const CELL_H = 150;

/** Bronmaat voor matrix3d — gemiddelde randlengtes van het quad. */
export function quadSourceSize(quad: Quad): { w: number; h: number } {
  const topW = Math.hypot(quad.tr[0] - quad.tl[0], quad.tr[1] - quad.tl[1]);
  const botW = Math.hypot(quad.br[0] - quad.bl[0], quad.br[1] - quad.bl[1]);
  const leftH = Math.hypot(quad.bl[0] - quad.tl[0], quad.bl[1] - quad.tl[1]);
  const rightH = Math.hypot(quad.br[0] - quad.tr[0], quad.br[1] - quad.tr[1]);
  return { w: (topW + botW) / 2, h: (leftH + rightH) / 2 };
}

/** Verschuift alle hoekpunten (bv. muurschaduw achter kader). */
export function offsetQuad(quad: Quad, dx: number, dy: number): Quad {
  const shift = ([x, y]: [number, number]): [number, number] => [x + dx, y + dy];
  return { tl: shift(quad.tl), tr: shift(quad.tr), br: shift(quad.br), bl: shift(quad.bl) };
}

/** Draait quad rond een ankerpunt (positief = met de klok mee op scherm, y-omlaag). */
export function rotateQuadAroundPoint(quad: Quad, pivot: [number, number], clockWiseDeg: number): Quad {
  const rad = (-clockWiseDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rotate = ([x, y]: [number, number]): [number, number] => {
    const dx = x - pivot[0];
    const dy = y - pivot[1];
    return [pivot[0] + dx * cos - dy * sin, pivot[1] + dx * sin + dy * cos];
  };
  return { tl: rotate(quad.tl), tr: rotate(quad.tr), br: rotate(quad.br), bl: rotate(quad.bl) };
}

/** Vergroot quad uniform vanuit het middelpunt (px) — betere dekking witte vlakken. */
export function expandQuad(quad: Quad, px: number): Quad {
  const cx = (quad.tl[0] + quad.tr[0] + quad.br[0] + quad.bl[0]) / 4;
  const cy = (quad.tl[1] + quad.tr[1] + quad.br[1] + quad.bl[1]) / 4;
  const grow = ([x, y]: [number, number]): [number, number] => {
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.hypot(dx, dy) || 1;
    return [x + (dx / len) * px, y + (dy / len) * px];
  };
  return {
    tl: grow(quad.tl),
    tr: grow(quad.tr),
    br: grow(quad.br),
    bl: grow(quad.bl),
  };
}

export type AngledWallCell = {
  topAngle?: number;
  bottomAngle?: number;
  /** Bovenrandbreedte in px (perspectief). */
  width?: number;
  /** Linkerrandhoogte in px (perspectief). */
  height?: number;
  /** Extra verticale verschuiving (px, positief = omlaag). */
  yOffset?: number;
  /** Extra horizontale verschuiving (px, negatief = links). Geldt per kolom (ook onderste rij). */
  xOffset?: number;
};

type SizedAngledWallCell = {
  topAngle: number;
  bottomAngle: number;
  width: number;
  height: number;
};

export type AngledWallRow = {
  yTop: number;
  /** Hoek van de gedeelde bovenrandlijn voor alle foto's in deze rij (onderste rij). */
  topLineAngle?: number;
  /**
   * Extra kanteling van de hele rij (°): positief = linkerkant omlaag, rechterkant omhoog.
   * Trekt af van boven- en onderrandhoek.
   */
  rowTiltDeg?: number;
  cells: AngledWallCell[];
};

export type AngledWallLayout = {
  anchorX: number;
  columns: { left: number; right: number }[];
  rows: AngledWallRow[];
  /** Tussenruimte onder bovenste rij (px). */
  rowGap?: number;
  /** Uniforme schaalfactor voor breedte/hoogte/gap (hoeken blijven gelijk). */
  scale?: number;
  /** Extra breedteschaal bovenop `scale` (hoogte ongewijzigd). */
  widthScale?: number;
  /** Naamplaat boven de muurfoto's. */
  namePlate?: WallNamePlateConfig;
  /** Verticaal label naast de paal (Modellenfiche). */
  wallLabel?: WallVerticalLabelConfig;
};

export type WallVerticalLabelConfig = {
  x?: number;
  yTop?: number;
  /** Onderkant van het label op plinth-hoogte (px). */
  yBottom?: number;
  width?: number;
  height?: number;
  topAngle?: number;
  bottomAngle?: number;
  tiltDeg?: number;
  /** Positief = hele label met de klok mee rond linksonder (onderkant naar rechts). */
  bottomTiltDeg?: number;
  /** Hoeken afleiden uit muur-verdwijnpunt (gemeten via fotogrid). Standaard true. */
  deriveFromWall?: boolean;
  /** Extra kanteling bovenkant (°), bovenop afgeleide muurhoek. */
  topAngleAdjustDeg?: number;
  fontSize?: number;
  letterSpacing?: number;
  quad?: Quad;
};

export type WallGalleryLabelsConfig = {
  deriveFromWall?: boolean;
  /** Ruimte onder onderste fotori (px). */
  gapBelow?: number;
  labelHeight?: number;
  fontSize?: number;
  letterSpacing?: number;
  topAngleAdjustDeg?: number;
  modellen?: { width?: number; xOffset?: number; yOffset?: number; leftDipDeg?: number; leftDropExtraPx?: number };
  gallerij?: {
    width?: number;
    /** 0–1 vanaf linkerrand grid */
    xFraction?: number;
    yOffset?: number;
    /** Lettergrootte rechts (achter op muur), bijv. 0.82 */
    letterShrinkRight?: number;
    /** Extra neerwaartse kanteling linkerkant (°). */
    leftDipDeg?: number;
    /** Extra px omlaag op linkerletter. */
    leftDropExtraPx?: number;
  };
};

export type WallGalleryLabelItem = {
  text: string;
  quad: Quad;
  fontSize: number;
  letterSpacing: number;
  /** Lettergrootte rechts t.o.v. links (0–1) — muurperspectief. */
  letterShrinkRight?: number;
  /** Linkerkant van het woord omlaag (px op linkerletter). */
  leftDipDeg?: number;
  leftDropExtraPx?: number;
};

export type WallNamePlateConfig = {
  /** Ruimte boven de bovenste fotori (px, vóór scale). */
  gapAboveTopRow?: number;
  height?: number;
  padLeft?: number;
  padRight?: number;
  /** Muurlijn-hoek (°); standaard = gemiddelde bovenste rij. */
  topAngle?: number;
  /** Onderrand; standaard = zelfde als topAngle (parallel op muurvlak). */
  bottomAngle?: number;
  /** Extra kanteling: positief = linkerkant omlaag. */
  tiltDeg?: number;
  /** Horizontale verschuiving (px). */
  xOffset?: number;
  /** Lettergrootte rechts t.o.v. links (0–1, bijv. 0.76). */
  letterShrinkRight?: number;
  /** Expliciet quad (overschrijft berekening). */
  quad?: Quad;
};

/** Quad uit linkerbovenhoek + breedte/hoogte/hoeken (schermcoördinaten). */
export function quadFromSizedCell(tl: [number, number], cell: SizedAngledWallCell): Quad {
  const tRad = (cell.topAngle * Math.PI) / 180;
  const bRad = (cell.bottomAngle * Math.PI) / 180;
  const w = cell.width;
  const h = cell.height;
  const bl: [number, number] = [tl[0], tl[1] + h];
  return {
    tl,
    tr: [tl[0] + w * Math.cos(tRad), tl[1] + w * Math.sin(tRad)],
    br: [bl[0] + w * Math.cos(bRad), bl[1] + w * Math.sin(bRad)],
    bl,
  };
}

/** Hoek in graden t.o.v. horizontaal; positief = lijn daalt naar rechts (scherm-y). */
export function yOnScreenAngledLine(x: number, xRef: number, yRef: number, angleDeg: number): number {
  const rad = (angleDeg * Math.PI) / 180;
  return yRef + (x - xRef) * Math.tan(rad);
}

/** @deprecated Gebruik yOnScreenAngledLine — wiskunde-y-omhoog conventie. */
export function yOnAngledLine(x: number, xRef: number, yRef: number, angleDeg: number): number {
  const rad = (angleDeg * Math.PI) / 180;
  return yRef - (x - xRef) * Math.tan(rad);
}

/** Vult ontbrekende hoeken/afmetingen van onderste rij vanuit bovenste rij (zelfde kolom). */
function resolveWallCell(
  layout: AngledWallLayout,
  rowIndex: number,
  colIndex: number,
  cell: AngledWallCell | undefined,
): (SizedAngledWallCell & Pick<AngledWallCell, 'yOffset' | 'xOffset'>) | null {
  const topCell = layout.rows[0]?.cells[colIndex];
  if (!topCell?.width || !topCell.height || topCell.topAngle == null || topCell.bottomAngle == null) {
    return null;
  }

  if (rowIndex === 0) {
    if (!cell?.width || !cell.height || cell.topAngle == null || cell.bottomAngle == null) return null;
    return cell;
  }

  return {
    topAngle: cell?.topAngle ?? topCell.topAngle,
    bottomAngle: cell?.bottomAngle ?? topCell.bottomAngle,
    width: cell?.width ?? topCell.width,
    height: cell?.height ?? topCell.height,
    yOffset: cell?.yOffset,
    xOffset: cell?.xOffset,
  };
}

/** Gemiddelde bovenlijn-hoek van de bovenste rij (muurperspectief). */
function averageTopLineAngle(layout: AngledWallLayout): number {
  const cells = layout.rows[0]?.cells ?? [];
  const angles = cells.map((c) => c.topAngle).filter((a): a is number => a != null);
  if (!angles.length) return 0;
  return angles.reduce((sum, a) => sum + a, 0) / angles.length;
}

/** Gemiddelde onderrandhoek van de bovenste rij. */
function averageBottomAngle(layout: AngledWallLayout): number {
  const cells = layout.rows[0]?.cells ?? [];
  const angles = cells.map((c) => c.bottomAngle).filter((a): a is number => a != null);
  if (!angles.length) return 0;
  return angles.reduce((sum, a) => sum + a, 0) / angles.length;
}

/** Snijpunt van twee lijnen door p1/p2 onder hoek a1/a2 (° t.o.v. horizontaal, y-omlaag positief). */
function intersectAngledLines(
  p1: [number, number],
  a1: number,
  p2: [number, number],
  a2: number,
): [number, number] {
  const t1 = Math.tan((a1 * Math.PI) / 180);
  const t2 = Math.tan((a2 * Math.PI) / 180);
  if (Math.abs(t1 - t2) < 1e-9) {
    return [p1[0] + 1000, p1[1] + 1000 * t1];
  }
  const x = (p2[1] - p1[1] + t1 * p1[0] - t2 * p2[0]) / (t1 - t2);
  return [x, p1[1] + t1 * (x - p1[0])];
}

/** Verdwijnpunt horizontale muurlijnen, afgeleid uit gemeten fotogrid. */
export function deriveWallVanishingPoint(layout: AngledWallLayout): [number, number] {
  const scale = layout.scale ?? 1;
  const widthScale = layout.widthScale ?? 1;
  const topRow = layout.rows[0];
  if (!topRow) return [1600, 756];

  const vps: [number, number][] = [];
  for (let c = 0; c < layout.columns.length; c++) {
    const cell = resolveWallCell(layout, 0, c, topRow.cells[c]);
    if (!cell) continue;

    const col = layout.columns[c]!;
    const x = col.left + (cell.xOffset ?? 0);
    const tl: [number, number] = [
      x,
      yOnScreenAngledLine(x, layout.anchorX, topRow.yTop + (cell.yOffset ?? 0), cell.topAngle),
    ];
    const q = quadFromSizedCell(tl, {
      topAngle: cell.topAngle,
      bottomAngle: cell.bottomAngle,
      width: cell.width * scale * widthScale,
      height: cell.height * scale,
    });
    vps.push(intersectAngledLines(q.tl, cell.topAngle, q.bl, cell.bottomAngle));
  }

  if (!vps.length) return [1600, 756];
  return [
    vps.reduce((sum, p) => sum + p[0], 0) / vps.length,
    vps.reduce((sum, p) => sum + p[1], 0) / vps.length,
  ];
}

/** Muurlijn-hoek (°) op scherm op hoogte y en positie x — positief = daalt naar rechts. */
export function wallLineAngleAtX(
  vanishingPoint: [number, number],
  x: number,
  y: number,
): number {
  return (Math.atan2(vanishingPoint[1] - y, vanishingPoint[0] - x) * 180) / Math.PI;
}

/** Naamplaat-quad op de linkermuur, boven de kleine foto's. */
export function buildWallNameQuad(layout: AngledWallLayout, cfg: WallNamePlateConfig = {}): Quad {
  if (cfg.quad) return cfg.quad;

  const scale = layout.scale ?? 1;
  const widthScale = layout.widthScale ?? 1;
  const topRow = layout.rows[0]!;
  const topCells = topRow.cells;
  const tilt = cfg.tiltDeg ?? 0;
  const baseAngle = cfg.topAngle ?? topCells[0]?.topAngle ?? averageTopLineAngle(layout);
  const lineAngle = baseAngle - tilt;
  const bottomAngle = (cfg.bottomAngle ?? baseAngle) - tilt;
  const gap = (cfg.gapAboveTopRow ?? 40) * scale;
  const height = (cfg.height ?? 100) * scale;
  const padLeft = cfg.padLeft ?? -12;
  const padRight = cfg.padRight ?? 16;
  const xOffset = cfg.xOffset ?? 0;

  const leftCol = layout.columns[0]!;
  const lastIdx = layout.columns.length - 1;
  const rightCol = layout.columns[lastIdx]!;
  const leftX = leftCol.left + (topCells[0]?.xOffset ?? 0) + padLeft + xOffset;
  const lastCell = topCells[lastIdx]!;
  const lastW = (lastCell?.width ?? 0) * scale * widthScale;
  const rightX = rightCol.left + (topCells[lastIdx]?.xOffset ?? 0) + lastW + padRight + xOffset;
  const width = rightX - leftX;

  const yRef = topRow.yTop - gap;
  const tl: [number, number] = [
    leftX,
    yOnScreenAngledLine(leftX, layout.anchorX, yRef, lineAngle),
  ];

  return quadFromSizedCell(tl, { topAngle: lineAngle, bottomAngle, width, height });
}

/** Verticaal label-quad op linkermuur (naast paal). */
export function buildWallVerticalLabelQuad(
  layout: AngledWallLayout,
  cfg: WallVerticalLabelConfig = {},
): Quad {
  if (cfg.quad) return cfg.quad;

  const topRow = layout.rows[0]!;
  const topCells = topRow.cells;
  const deriveFromWall = cfg.deriveFromWall !== false;
  const leftX = cfg.x ?? 95;
  const width = cfg.width ?? 72;
  const height = cfg.height ?? 640;

  let tlY: number;
  let yBottom: number;
  if (cfg.yBottom != null) {
    yBottom = cfg.yBottom;
    tlY = yBottom - height;
  } else {
    const yRef = cfg.yTop ?? 378;
    const refAngle = cfg.topAngle ?? topCells[0]?.topAngle ?? averageTopLineAngle(layout);
    tlY = yOnScreenAngledLine(leftX, layout.anchorX, yRef, refAngle);
    yBottom = tlY + height;
  }

  let topAngle: number;
  let bottomAngle: number;
  if (deriveFromWall) {
    const vp = deriveWallVanishingPoint(layout);
    topAngle = wallLineAngleAtX(vp, leftX, tlY) + (cfg.topAngleAdjustDeg ?? 0);
    bottomAngle = wallLineAngleAtX(vp, leftX, yBottom);
  } else {
    const baseAngle = cfg.topAngle ?? topCells[0]?.topAngle ?? averageTopLineAngle(layout);
    topAngle = baseAngle;
    bottomAngle = cfg.bottomAngle ?? baseAngle;
  }

  const tl: [number, number] = [leftX, tlY];
  const quad = quadFromSizedCell(tl, { topAngle, bottomAngle, width, height });
  const bottomTilt = deriveFromWall ? 0 : (cfg.bottomTiltDeg ?? cfg.tiltDeg ?? 0);

  if (bottomTilt !== 0) {
    return rotateQuadAroundPoint(quad, quad.bl, bottomTilt);
  }

  return quad;
}

/** Label-quad met hoek per rand (links/rechts) — links iets lager dan rechts op de muur. */
function buildPerspectiveLabelQuad(
  vp: [number, number],
  x: number,
  yTop: number,
  width: number,
  height: number,
  topAdjust = 0,
): Quad {
  const yBottom = yTop + height;
  const tl: [number, number] = [x, yTop];
  const bl: [number, number] = [x, yBottom];

  const topAngle = wallLineAngleAtX(vp, x, yTop) + topAdjust;
  const bottomAngleR = wallLineAngleAtX(vp, x + width, yBottom);
  const tRad = (topAngle * Math.PI) / 180;
  const bRadR = (bottomAngleR * Math.PI) / 180;

  return {
    tl,
    tr: [tl[0] + width * Math.cos(tRad), tl[1] + width * Math.sin(tRad)],
    br: [bl[0] + width * Math.cos(bRadR), bl[1] + width * Math.sin(bRadR)],
    bl,
  };
}

/** Twee muurlabels onder de fotogrid: links Modellen, halverwege lager Gallerij. */
export function buildWallGalleryLabels(
  layout: AngledWallLayout,
  wallQuads: Quad[],
  cfg: WallGalleryLabelsConfig = {},
): WallGalleryLabelItem[] {
  const cols = layout.columns.length;
  if (wallQuads.length < cols) return [];

  const bottomRow = wallQuads.slice(-cols);
  const gridLeft = bottomRow[0]!.bl[0];
  const gridRight = bottomRow[cols - 1]!.br[0];
  const gridBottom = Math.max(...bottomRow.flatMap((q) => [q.bl[1], q.br[1]]));
  const gridWidth = gridRight - gridLeft;

  const gapBelow = cfg.gapBelow ?? 28;
  const labelH = cfg.labelHeight ?? 42;
  const fontSize = cfg.fontSize ?? 32;
  const letterSpacing = cfg.letterSpacing ?? 0.1;
  const deriveFromWall = cfg.deriveFromWall !== false;
  const topAdjust = cfg.topAngleAdjustDeg ?? 0;

  const placements: {
    text: string;
    x: number;
    yTop: number;
    width: number;
    perspective?: boolean;
    letterShrinkRight?: number;
    leftDipDeg?: number;
    leftDropExtraPx?: number;
  }[] = [
    {
      text: 'Modellen',
      x: gridLeft + (cfg.modellen?.xOffset ?? 0),
      yTop: gridBottom + gapBelow + (cfg.modellen?.yOffset ?? 0),
      width: cfg.modellen?.width ?? 210,
      leftDipDeg: cfg.modellen?.leftDipDeg ?? 1,
      leftDropExtraPx: cfg.modellen?.leftDropExtraPx ?? 0,
    },
    {
      text: 'Gallerij',
      x: gridLeft + gridWidth * (cfg.gallerij?.xFraction ?? 0.48),
      yTop: gridBottom + gapBelow + (cfg.gallerij?.yOffset ?? 22),
      width: cfg.gallerij?.width ?? 190,
      perspective: true,
      letterShrinkRight: cfg.gallerij?.letterShrinkRight ?? 0.82,
      leftDipDeg: cfg.gallerij?.leftDipDeg ?? 1,
      leftDropExtraPx: cfg.gallerij?.leftDropExtraPx ?? 0,
    },
  ];

  const vp = deriveFromWall ? deriveWallVanishingPoint(layout) : null;

  return placements.map(({ text, x, yTop, width, perspective, letterShrinkRight, leftDipDeg, leftDropExtraPx }) => {
    const yBottom = yTop + labelH;
    let quad: Quad;

    if (deriveFromWall && vp && perspective) {
      quad = buildPerspectiveLabelQuad(vp, x, yTop, width, labelH, topAdjust);
    } else if (deriveFromWall && vp) {
      const topAngle = wallLineAngleAtX(vp, x, yTop) + topAdjust;
      const bottomAngle = wallLineAngleAtX(vp, x, yBottom);
      quad = quadFromSizedCell([x, yTop], { topAngle, bottomAngle, width, height: labelH });
    } else {
      const base = averageTopLineAngle(layout);
      quad = quadFromSizedCell([x, yTop], {
        topAngle: base,
        bottomAngle: base,
        width,
        height: labelH,
      });
    }

    return { text, quad, fontSize, letterSpacing, letterShrinkRight, leftDipDeg, leftDropExtraPx };
  });
}

/** y-ref op anchorX zodat de rijlijn overal onder de rij erboven + gap ligt. */
function rowLineYRefAtAnchor(
  layout: AngledWallLayout,
  topQuads: Quad[],
  lineAngleDeg: number,
  rowGap: number,
): number {
  const tan = Math.tan((lineAngleDeg * Math.PI) / 180);
  const topCells = layout.rows[0]?.cells ?? [];
  let yRef = -Infinity;

  for (let c = 0; c < layout.columns.length; c++) {
    const col = layout.columns[c]!;
    const x = col.left + (topCells[c]?.xOffset ?? 0);
    const minY = topQuads[c]!.bl[1] + rowGap;
    yRef = Math.max(yRef, minY - (x - layout.anchorX) * tan);
  }

  return yRef;
}

/** Bouwt 8 muurfoto-quads uit gemeten breedte/hoogte/hoeken per foto. */
export function buildAngledWallQuads(layout: AngledWallLayout): Quad[] {
  const quads: Quad[] = [];
  const scale = layout.scale ?? 1;
  const widthScale = layout.widthScale ?? 1;
  const rowGap = (layout.rowGap ?? 60) * scale;
  const wallLineAngle = averageTopLineAngle(layout);

  for (let r = 0; r < layout.rows.length; r++) {
    const row = layout.rows[r]!;
    const topQuads =
      r > 0 ? quads.slice((r - 1) * layout.columns.length, r * layout.columns.length) : [];
    const rowTilt = r > 0 ? (row.rowTiltDeg ?? 0) : 0;
    const rowLineAngle = (row.topLineAngle ?? wallLineAngle) - rowTilt;
    const rowLineYRef =
      r > 0 ? rowLineYRefAtAnchor(layout, topQuads, rowLineAngle, rowGap) : row.yTop;

    for (let c = 0; c < layout.columns.length; c++) {
      const col = layout.columns[c]!;
      const cell = resolveWallCell(layout, r, c, row.cells[c]);
      if (!cell?.width || !cell.height || cell.topAngle == null || cell.bottomAngle == null) continue;

      const yShift = cell.yOffset ?? 0;
      const xShift = layout.rows[0]?.cells[c]?.xOffset ?? cell.xOffset ?? 0;
      const x = col.left + xShift;

      const sized: SizedAngledWallCell = {
        topAngle: r > 0 ? rowLineAngle : cell.topAngle,
        bottomAngle: cell.bottomAngle - rowTilt,
        width: cell.width * scale * widthScale,
        height: cell.height * scale,
      };

      const tl: [number, number] = [
        x,
        yOnScreenAngledLine(x, layout.anchorX, rowLineYRef, rowLineAngle) + yShift,
      ];

      quads.push(quadFromSizedCell(tl, sized));
    }
  }

  return quads;
}
