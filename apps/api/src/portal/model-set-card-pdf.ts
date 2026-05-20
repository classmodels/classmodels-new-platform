import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFFont, type PDFPage } from 'pdf-lib';
import sharp from 'sharp';

/** A5 staand (breedte × hoogte in pt). */
export const A5_PORTRAIT_W = 419.53;
export const A5_PORTRAIT_H = 595.28;

/** A5 liggend (breedte × hoogte in pt). */
export const A5_LANDSCAPE_W = 595.28;
export const A5_LANDSCAPE_H = 419.53;

export const VERSO_PHOTO_COUNT = 4;

const BURGUNDY = rgb(0.46, 0.09, 0.14);
const INK = rgb(0.12, 0.12, 0.12);
const MUTED = rgb(0.35, 0.35, 0.35);

const AGENCY_LINES = [
  'Class-Models',
  'Provinciebaan 3, 2235 Hulshout',
  'www.class-models.be',
  'info@class-models.be',
  'gsm +32 (0) 485 322 307',
];

export type StatEntry = { label: string; value: string };

export function computeAgeYears(geboortedatum: unknown): number | null {
  if (typeof geboortedatum !== 'string' || !geboortedatum.trim()) return null;
  const s = geboortedatum.trim();
  let d: Date | null = null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const dm = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})/.exec(s);
  if (!d && dm) d = new Date(Number(dm[3]), Number(dm[2]) - 1, Number(dm[1]));
  if (!d || Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

export function modelSheetStatEntries(ms: Record<string, unknown> | null): StatEntry[] {
  if (!ms) return [];
  const entries: StatEntry[] = [];
  const add = (label: string, key: string) => {
    const v = ms[key];
    if (v == null || v === '') return;
    const t = typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '';
    if (!t) return;
    entries.push({ label, value: t });
  };
  add('Lengte', 'lengte');
  add('Borst', 'borstomtrek');
  add('Taille', 'taille');
  add('Heupen', 'heupomtrek');
  add('Schoenen', 'schoenmaat');
  add('Haar', 'haarkleur');
  add('Ogen', 'kleurOgen');
  add('Maat', 'confectiemaat');
  if (!entries.some((e) => e.label === 'Maat')) add('Maat', 'maat');
  return entries;
}

export function modelSheetStatLines(ms: Record<string, unknown> | null): string[] {
  return modelSheetStatEntries(ms).map((e) => `${e.label}: ${e.value}`);
}

async function prepareJpegForPdf(bytes: Buffer): Promise<Buffer> {
  return sharp(bytes)
    .rotate()
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

async function embedRaster(pdfDoc: PDFDocument, bytes: Buffer): Promise<PDFImage> {
  return pdfDoc.embedJpg(await prepareJpegForPdf(bytes));
}

function drawImageCover(page: PDFPage, img: PDFImage, x: number, y: number, w: number, h: number) {
  const sc = Math.max(w / img.width, h / img.height);
  const dw = img.width * sc;
  const dh = img.height * sc;
  page.drawImage(img, {
    x: x + (w - dw) / 2,
    y: y + (h - dh) / 2,
    width: dw,
    height: dh,
  });
}

function drawCenteredText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  centerX: number,
  y: number,
  size: number,
  color = INK,
) {
  const tw = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: centerX - tw / 2, y, size, font, color });
}

function drawAgencyFooter(page: PDFPage, font: PDFFont, fontBold: PDFFont, pageW: number, yStart: number) {
  const cx = pageW / 2;
  let y = yStart;
  for (let i = 0; i < AGENCY_LINES.length; i++) {
    const line = AGENCY_LINES[i];
    const isBold = i === 0;
    const f = isBold ? fontBold : font;
    const size = isBold ? 9.5 : 8;
    drawCenteredText(page, f, line, cx, y, size, isBold ? INK : MUTED);
    y -= isBold ? 14 : 12;
  }
}

function drawStatBlock(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  x: number,
  yTop: number,
  width: number,
  displayName: string,
  entries: StatEntry[],
) {
  const nameUpper = displayName.trim().toUpperCase() || 'NAAM MODEL';
  const header = `NAAM: ${nameUpper}`;
  const headerSize = 10;
  page.drawText(header, { x, y: yTop - headerSize, size: headerSize, font: fontBold, color: INK });

  const labelColW = 52;
  const rowH = 15;
  const size = 9;
  let y = yTop - headerSize - 18;

  for (const entry of entries) {
    const label = `${entry.label}:`;
    page.drawText(label, { x, y: y - size, size, font, color: INK });
    page.drawText(entry.value, {
      x: x + labelColW,
      y: y - size,
      size,
      font,
      color: INK,
    });
    y -= rowH;
  }
}

/**
 * Recto — A5 staand: naam bovenaan, grote staande foto, bureaugegevens onderaan gecentreerd.
 */
export async function buildSetCardRectoPdf(opts: {
  heroBytes: Buffer;
  displayName: string;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A5_PORTRAIT_W, A5_PORTRAIT_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const heroImg = await embedRaster(pdfDoc, opts.heroBytes);

  const pad = 14;
  const cx = A5_PORTRAIT_W / 2;
  const nameUpper = opts.displayName.trim().toUpperCase() || 'NAAM MODEL';
  const nameSize = nameUpper.length > 24 ? 11 : 13;

  const footerH = 72;
  const headerH = 36;
  const photoY = pad + footerH;
  const photoH = A5_PORTRAIT_H - photoY - headerH - pad;
  const photoX = pad;
  const photoW = A5_PORTRAIT_W - 2 * pad;

  drawCenteredText(page, fontBold, nameUpper, cx, A5_PORTRAIT_H - pad - nameSize, nameSize, BURGUNDY);
  drawImageCover(page, heroImg, photoX, photoY, photoW, photoH);
  drawAgencyFooter(page, font, fontBold, A5_PORTRAIT_W, pad + footerH - 8);

  return pdfDoc.save();
}

/**
 * Verso — A5 liggend: links 2×2 foto’s, rechts naam + maten.
 */
export async function buildSetCardVersoPdf(opts: {
  versoBytes: Buffer[];
  displayName: string;
  statEntries: StatEntry[];
}): Promise<Uint8Array> {
  const { versoBytes, statEntries, displayName } = opts;
  if (versoBytes.length !== VERSO_PHOTO_COUNT) {
    throw new Error(`Precies ${VERSO_PHOTO_COUNT} foto’s nodig voor de achterzijde.`);
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A5_LANDSCAPE_W, A5_LANDSCAPE_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const thumbs: PDFImage[] = [];
  for (const b of versoBytes) thumbs.push(await embedRaster(pdfDoc, b));

  const pad = 12;
  const gap = 6;
  const statsW = 168;
  const photosX = pad;
  const photosY = pad;
  const photosW = A5_LANDSCAPE_W - 2 * pad - statsW - gap;
  const photosH = A5_LANDSCAPE_H - 2 * pad;
  const statsX = photosX + photosW + gap;

  const cellW = (photosW - gap) / 2;
  const cellH = (photosH - gap) / 2;
  const row1Y = photosY + cellH + gap;
  const row2Y = photosY;

  drawImageCover(page, thumbs[0], photosX, row1Y, cellW, cellH);
  drawImageCover(page, thumbs[1], photosX + cellW + gap, row1Y, cellW, cellH);
  drawImageCover(page, thumbs[2], photosX, row2Y, cellW, cellH);
  drawImageCover(page, thumbs[3], photosX + cellW + gap, row2Y, cellW, cellH);

  drawStatBlock(page, font, fontBold, statsX, photosY + photosH, statsW, displayName, statEntries);

  return pdfDoc.save();
}

export async function buildModelSetCardPdfPair(opts: {
  heroBytes: Buffer;
  versoBytes: Buffer[];
  displayName: string;
  statEntries: StatEntry[];
}): Promise<{ recto: Uint8Array; verso: Uint8Array }> {
  const recto = await buildSetCardRectoPdf({
    heroBytes: opts.heroBytes,
    displayName: opts.displayName,
  });
  const verso = await buildSetCardVersoPdf({
    versoBytes: opts.versoBytes,
    displayName: opts.displayName,
    statEntries: opts.statEntries,
  });
  return { recto, verso };
}
