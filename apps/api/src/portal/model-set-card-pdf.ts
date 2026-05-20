import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFFont, type PDFPage } from 'pdf-lib';
import sharp from 'sharp';

/** A5 staand (breedte × hoogte in pt). */
export const A5_PORTRAIT_W = 419.53;
export const A5_PORTRAIT_H = 595.28;

/** A5 liggend (breedte × hoogte in pt). */
export const A5_LANDSCAPE_W = 595.28;
export const A5_LANDSCAPE_H = 419.53;

export const VERSO_PHOTO_COUNT = 4;

/** Marges verso (20pt ≈ 20px minder dan 40). */
const VERSO_MARGIN_L = 20;
const VERSO_MARGIN_R = 20;
const VERSO_GAP_THUMB_HERO = 60;
const VERSO_THUMB_GAP = 12;
const PHOTO_SHADOW = rgb(0.9, 0.9, 0.9);

const BURGUNDY = rgb(0.46, 0.09, 0.14);
const INK = rgb(0.12, 0.12, 0.12);
const MUTED = rgb(0.35, 0.35, 0.35);

const FOOTER_LINE_1 = 'Class-Models  ·  Provinciebaan 3, 2235 Hulshout  ·  www.class-models.be';
const FOOTER_LINE_2 = 'info@class-models.be  ·  gsm +32 (0) 485 322 307';

const BESCHIKBAAR_LABELS: Record<string, string> = {
  Modeshows: 'modeshows',
  'Foto opdrachten': 'Foto opdrachten',
  Reklame: 'Reclame',
  'Host/hostess': 'Host / Hostess',
  'Lingerie/Bikini': 'Lingerie',
  'Artistiek naakt': 'Artistiek naakt',
};

export type StatEntry = { label: string; value: string };

export function computeAgeYears(geboortedatum: unknown): number | null {
  const y = computeBirthYear(geboortedatum);
  if (!y) return null;
  const age = new Date().getFullYear() - Number(y);
  return age >= 0 && age < 120 ? age : null;
}

export function computeBirthYear(geboortedatum: unknown): string | null {
  if (typeof geboortedatum !== 'string' || !geboortedatum.trim()) return null;
  const s = geboortedatum.trim();
  const iso = /^(\d{4})/.exec(s);
  if (iso) return iso[1];
  const dm = /(\d{4})\s*$/.exec(s);
  return dm ? dm[1] : null;
}

export function formatBeschikbaarLine(ms: Record<string, unknown> | null): string {
  const raw = ms?.beschikbaar;
  if (!Array.isArray(raw) || raw.length === 0) return '';
  const parts = raw
    .map((x) => BESCHIKBAAR_LABELS[String(x).trim()] ?? String(x).trim())
    .filter(Boolean);
  if (!parts.length) return '';
  return `${parts.join(' - ')} -`;
}

function readField(ms: Record<string, unknown> | null, ...keys: string[]): string {
  if (!ms) return '';
  for (const key of keys) {
    const v = ms[key];
    if (v == null || v === '') continue;
    const t = typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '';
    if (t) return t;
  }
  return '';
}

function formatMeasure(label: string, raw: string): string {
  const v = raw.trim();
  if (!v) return '—';
  const noCm = new Set(['SCHOENMAAT', 'MAAT', 'CONFECTIEMAAT', 'JEANSMAAT', 'BH-MAAT', 'GEBOORTEJAAR']);
  if (noCm.has(label)) return v;
  if (/cm$/i.test(v)) return v;
  if (/^\d+([.,]\d+)?$/.test(v)) return `${v} cm`;
  return v;
}

/** Alle maten voor achterzijde (volgorde zoals MODEL INFO-voorbeeld). */
export function modelSheetVersoStatEntries(
  ms: Record<string, unknown> | null,
  birthYear: string | null,
): StatEntry[] {
  const rows: StatEntry[] = [
    { label: 'LENGTE', value: formatMeasure('LENGTE', readField(ms, 'lengte')) },
    { label: 'MAAT', value: formatMeasure('MAAT', readField(ms, 'maat')) },
    { label: 'SCHOENMAAT', value: formatMeasure('SCHOENMAAT', readField(ms, 'schoenmaat')) },
    { label: 'BH-MAAT', value: formatMeasure('BH-MAAT', readField(ms, 'bhMaat', 'bh_maat')) },
    { label: 'BORSTOMTREK', value: formatMeasure('BORSTOMTREK', readField(ms, 'borstomtrek', 'borst')) },
    { label: 'CONFECTIEMAAT', value: formatMeasure('CONFECTIEMAAT', readField(ms, 'confectiemaat')) },
    { label: 'HEUPOMTREK', value: formatMeasure('HEUPOMTREK', readField(ms, 'heupomtrek', 'heupen')) },
    { label: 'JEANSMAAT', value: formatMeasure('JEANSMAAT', readField(ms, 'jeansmaat')) },
    { label: 'TAILLE', value: formatMeasure('TAILLE', readField(ms, 'taille')) },
    { label: 'HAARKLEUR', value: formatMeasure('HAARKLEUR', readField(ms, 'haarkleur', 'haar')) },
    { label: 'KLEUR OGEN', value: formatMeasure('KLEUR OGEN', readField(ms, 'kleurOgen', 'ogen')) },
  ];
  return rows;
}

/** Korte lijst voor API-preview / legacy. */
export function modelSheetStatEntries(ms: Record<string, unknown> | null): StatEntry[] {
  if (!ms) return [];
  const entries: StatEntry[] = [];
  const add = (label: string, key: string, altKeys: string[] = []) => {
    const t = readField(ms, key, ...altKeys);
    if (t) entries.push({ label, value: formatMeasure(label.toUpperCase(), t) });
  };
  add('Lengte', 'lengte');
  add('Borst', 'borstomtrek', ['borst']);
  add('Taille', 'taille');
  add('Heupen', 'heupomtrek', ['heupen']);
  add('Schoenen', 'schoenmaat');
  add('Haar', 'haarkleur', ['haar']);
  add('Ogen', 'kleurOgen', ['ogen', 'kleur_ogen']);
  add('Maat', 'confectiemaat', ['maat']);
  return entries;
}

export function modelSheetStatLines(ms: Record<string, unknown> | null): string[] {
  return modelSheetStatEntries(ms).map((e) => `${e.label}: ${e.value}`);
}

async function prepareJpegForPdf(bytes: Buffer, portrait = false): Promise<Buffer> {
  const maxW = portrait ? 1400 : 1200;
  const maxH = portrait ? 2000 : 1200;
  return sharp(bytes)
    .rotate()
    .resize(maxW, maxH, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

async function embedRaster(pdfDoc: PDFDocument, bytes: Buffer, portrait = false): Promise<PDFImage> {
  return pdfDoc.embedJpg(await prepareJpegForPdf(bytes, portrait));
}

function drawImageContain(page: PDFPage, img: PDFImage, x: number, y: number, w: number, h: number) {
  const sc = Math.min(w / img.width, h / img.height);
  const dw = img.width * sc;
  const dh = img.height * sc;
  page.drawImage(img, {
    x: x + (w - dw) / 2,
    y: y + (h - dh) / 2,
    width: dw,
    height: dh,
  });
}

/** Lichte schaduw achter foto (zakelijk). */
function drawImageContainWithShadow(page: PDFPage, img: PDFImage, x: number, y: number, w: number, h: number) {
  const pad = 2;
  const off = 2.5;
  page.drawRectangle({
    x: x - pad + off,
    y: y - pad,
    width: w + pad * 2,
    height: h + pad * 2,
    color: PHOTO_SHADOW,
  });
  drawImageContain(page, img, x, y, w, h);
}

function drawHLine(page: PDFPage, x: number, y: number, w: number, thickness = 0.65, color = MUTED) {
  page.drawLine({ start: { x, y }, end: { x: x + w, y }, thickness, color });
}

function drawCenteredInBox(
  page: PDFPage,
  font: PDFFont,
  text: string,
  boxX: number,
  boxW: number,
  y: number,
  size: number,
  color = INK,
) {
  const tw = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: boxX + Math.max(0, (boxW - tw) / 2), y, size, font, color });
}

function fitFontSize(font: PDFFont, text: string, maxW: number, startSize: number): number {
  let size = startSize;
  while (size > 5.5 && font.widthOfTextAtSize(text, size) > maxW) size -= 0.25;
  return size;
}

function drawAgencyFooterBetweenLines(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  boxX: number,
  boxW: number,
  yBottom: number,
) {
  const blockH = 30;
  const yTop = yBottom + blockH;
  drawHLine(page, boxX, yTop, boxW);
  const size1 = fitFontSize(fontBold, FOOTER_LINE_1, boxW, 7.5);
  const size2 = fitFontSize(font, FOOTER_LINE_2, boxW, 7.5);
  drawCenteredInBox(page, fontBold, FOOTER_LINE_1, boxX, boxW, yBottom + 16, size1, INK);
  drawCenteredInBox(page, font, FOOTER_LINE_2, boxX, boxW, yBottom + 4, size2, MUTED);
  drawHLine(page, boxX, yBottom, boxW);
}

/** MODEL INFO links, geboortejaar eronder, maten met rode verticale lijnen. */
function drawModelInfoBlock(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  boxX: number,
  boxW: number,
  yTop: number,
  statsBottomY: number,
  birthYear: string | null,
  statRows: StatEntry[],
) {
  const headerSize = 11;
  const yearSize = 9.5;
  const rowSize = 8.5;
  const rowH = 14;
  const textPad = 14;

  let y = yTop - 10;

  page.drawText('MODEL INFO', {
    x: boxX,
    y: y - headerSize,
    size: headerSize,
    font: fontBold,
    color: BURGUNDY,
  });
  y -= headerSize + 7;

  const yearText = birthYear?.trim() || '—';
  page.drawText(yearText, {
    x: boxX,
    y: y - yearSize,
    size: yearSize,
    font,
    color: INK,
  });
  y -= yearSize + 6;
  drawHLine(page, boxX, y, boxW, 0.75, BURGUNDY);
  y -= 12;

  const statsTop = y;
  const statsH = statRows.length * rowH + 6;
  const statsBase = Math.max(statsBottomY, statsTop - statsH);

  page.drawLine({
    start: { x: boxX, y: statsBase },
    end: { x: boxX, y: statsTop },
    thickness: 0.85,
    color: BURGUNDY,
  });
  page.drawLine({
    start: { x: boxX + boxW, y: statsBase },
    end: { x: boxX + boxW, y: statsTop },
    thickness: 0.85,
    color: BURGUNDY,
  });

  let rowY = statsTop - 8;
  for (const entry of statRows) {
    rowY -= rowH;
    const baseline = rowY + (rowH - rowSize) / 2;
    page.drawText(entry.label, {
      x: boxX + textPad,
      y: baseline,
      size: rowSize,
      font,
      color: INK,
    });
    const vw = font.widthOfTextAtSize(entry.value, rowSize);
    page.drawText(entry.value, {
      x: boxX + boxW - textPad - vw,
      y: baseline,
      size: rowSize,
      font,
      color: INK,
    });
  }
}

function drawVersoBottomFooter(
  page: PDFPage,
  font: PDFFont,
  x: number,
  w: number,
  yBase: number,
  beschikbaarLine: string,
) {
  const size = 8;
  page.drawText('Beschikbaar voor', { x: x + 2, y: yBase + 24, size, font, color: INK });
  drawHLine(page, x, yBase + 18, w);
  const line = beschikbaarLine.trim() || '—';
  const lineSize = fitFontSize(font, line, w - 4, 8);
  page.drawText(line, { x: x + 2, y: yBase + 6, size: lineSize, font, color: INK });
  drawHLine(page, x, yBase, w);
}

function computeVersoPhotoLayout() {
  const padTop = 12;
  const footerH = 40;
  const contentTop = A5_LANDSCAPE_H - padTop;
  const photosBottom = 12 + footerH;
  const photoH = contentTop - photosBottom;

  const thumbW = 78;
  const thumbsTotalW = 3 * thumbW + 2 * VERSO_THUMB_GAP;
  const heroW = A5_LANDSCAPE_W - VERSO_MARGIN_L - VERSO_MARGIN_R - VERSO_GAP_THUMB_HERO - thumbsTotalW;
  const heroX = A5_LANDSCAPE_W - VERSO_MARGIN_R - heroW;
  const leftZoneW = heroX - VERSO_GAP_THUMB_HERO - VERSO_MARGIN_L;

  return {
    contentTop,
    photosBottom,
    photoH,
    thumbW,
    thumbsTotalW,
    heroW,
    heroX,
    leftZoneW,
    thumbXs: [
      VERSO_MARGIN_L,
      VERSO_MARGIN_L + thumbW + VERSO_THUMB_GAP,
      VERSO_MARGIN_L + 2 * (thumbW + VERSO_THUMB_GAP),
    ],
  };
}

/**
 * Recto — A5 staand: naam tussen lijnen, foto zonder kader, bureau tussen lijnen.
 */
export async function buildSetCardRectoPdf(opts: {
  heroBytes: Buffer;
  displayName: string;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A5_PORTRAIT_W, A5_PORTRAIT_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const heroImg = await embedRaster(pdfDoc, opts.heroBytes, true);

  const margin = 14;
  const contentW = A5_PORTRAIT_W - 2 * margin;
  const nameUpper = opts.displayName.trim().toUpperCase() || 'NAAM MODEL';
  const nameSize = nameUpper.length > 26 ? 11 : 13;

  const nameBlockH = 28;
  const footerBlockH = 36;
  const gap = 6;

  const photoX = margin;
  const photoW = contentW;
  const photoBottom = margin + footerBlockH + gap;
  const photoTop = A5_PORTRAIT_H - margin - nameBlockH - gap;
  const photoH = photoTop - photoBottom;

  const nameY = A5_PORTRAIT_H - margin - nameSize - 6;
  const nameW = fontBold.widthOfTextAtSize(nameUpper, nameSize);
  const nameX = photoX + (photoW - nameW) / 2;

  drawHLine(page, photoX, nameY + nameSize + 5, photoW, 0.7, INK);
  page.drawText(nameUpper, {
    x: nameX,
    y: nameY,
    size: nameSize,
    font: fontBold,
    color: BURGUNDY,
  });
  drawHLine(page, photoX, nameY - 5, photoW, 0.7, INK);

  drawImageContain(page, heroImg, photoX, photoBottom, photoW, photoH);
  drawAgencyFooterBetweenLines(page, font, fontBold, photoX, photoW, margin + 2);

  return pdfDoc.save();
}

/**
 * Verso — A5 liggend: MODEL INFO links, 3 grote thumbs, hero rechts (40pt marges).
 */
export async function buildSetCardVersoPdf(opts: {
  versoBytes: Buffer[];
  versoStatEntries: StatEntry[];
  birthYear: string | null;
  beschikbaarLine: string;
}): Promise<Uint8Array> {
  const { versoBytes, versoStatEntries, birthYear, beschikbaarLine } = opts;
  if (versoBytes.length !== VERSO_PHOTO_COUNT) {
    throw new Error(`Precies ${VERSO_PHOTO_COUNT} foto’s nodig voor de achterzijde.`);
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A5_LANDSCAPE_W, A5_LANDSCAPE_H]);
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const thumbs: PDFImage[] = [];
  for (const b of versoBytes) thumbs.push(await embedRaster(pdfDoc, b));

  const layout = computeVersoPhotoLayout();

  drawModelInfoBlock(
    page,
    font,
    fontBold,
    VERSO_MARGIN_L,
    layout.leftZoneW,
    layout.contentTop,
    layout.photosBottom + layout.photoH,
    birthYear,
    versoStatEntries,
  );

  for (let i = 0; i < 3; i++) {
    drawImageContainWithShadow(
      page,
      thumbs[i],
      layout.thumbXs[i],
      layout.photosBottom,
      layout.thumbW,
      layout.photoH,
    );
  }

  drawImageContainWithShadow(
    page,
    thumbs[3],
    layout.heroX,
    layout.photosBottom,
    layout.heroW,
    layout.photoH,
  );

  drawVersoBottomFooter(
    page,
    font,
    VERSO_MARGIN_L,
    A5_LANDSCAPE_W - VERSO_MARGIN_L - VERSO_MARGIN_R,
    12,
    beschikbaarLine,
  );

  return pdfDoc.save();
}

export async function buildModelSetCardPdfPair(opts: {
  heroBytes: Buffer;
  versoBytes: Buffer[];
  displayName: string;
  versoStatEntries: StatEntry[];
  birthYear: string | null;
  beschikbaarLine: string;
}): Promise<{ recto: Uint8Array; verso: Uint8Array }> {
  const recto = await buildSetCardRectoPdf({
    heroBytes: opts.heroBytes,
    displayName: opts.displayName,
  });
  const verso = await buildSetCardVersoPdf({
    versoBytes: opts.versoBytes,
    versoStatEntries: opts.versoStatEntries,
    birthYear: opts.birthYear,
    beschikbaarLine: opts.beschikbaarLine,
  });
  return { recto, verso };
}
