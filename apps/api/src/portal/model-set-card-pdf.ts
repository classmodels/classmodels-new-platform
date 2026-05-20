import { PDFDocument, StandardFonts, degrees, rgb, type PDFImage, type PDFFont, type PDFPage } from 'pdf-lib';
import sharp from 'sharp';

/** A5 liggend (breedte × hoogte in pt). */
export const A5_LANDSCAPE_W = 595.28;
export const A5_LANDSCAPE_H = 419.53;

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

/** Tekst langs linkerkant, leesbaar van onder naar boven (zoals voorbeeld). */
function drawVerticalNameLeft(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  yBottom: number,
  size: number,
) {
  const tw = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x,
    y: yBottom + tw,
    size,
    font,
    color: BURGUNDY,
    rotate: degrees(90),
  });
}

/** Tekst langs rechterkant, van boven naar beneden leesbaar (niet omgekeerd). */
function drawVerticalAgencyRight(page: PDFPage, font: PDFFont, fontBold: PDFFont, x: number, yTop: number) {
  let y = yTop;
  for (const line of AGENCY_LINES) {
    const isBold = line === AGENCY_LINES[0];
    const f = isBold ? fontBold : font;
    const size = isBold ? 8.5 : 7;
    const lw = f.widthOfTextAtSize(line, size);
    page.drawText(line, {
      x,
      y: y - lw,
      size,
      font: f,
      color: isBold ? INK : MUTED,
      rotate: degrees(-90),
    });
    y -= lw + 5;
  }
}

function drawStatBlock(
  page: PDFPage,
  font: PDFFont,
  x: number,
  yTop: number,
  width: number,
  entries: StatEntry[],
) {
  const rowH = 15;
  const size = 9;
  let y = yTop;
  for (const entry of entries) {
    const label = `${entry.label}:`;
    page.drawText(label, { x, y: y - size, size, font, color: INK });
    const vw = font.widthOfTextAtSize(entry.value, size);
    page.drawText(entry.value, {
      x: x + width - vw,
      y: y - size,
      size,
      font,
      color: INK,
    });
    y -= rowH;
  }
}

/**
 * Recto — A5 liggend: grote liggende foto, naam links (verticaal), bureau rechts (verticaal, juiste richting).
 */
export async function buildSetCardRectoPdf(opts: {
  heroBytes: Buffer;
  displayName: string;
  ageLabel: string | null;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A5_LANDSCAPE_W, A5_LANDSCAPE_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const heroImg = await embedRaster(pdfDoc, opts.heroBytes);

  const pad = 10;
  const sideW = 48;
  const photoX = pad + sideW;
  const photoY = pad;
  const photoW = A5_LANDSCAPE_W - 2 * pad - 2 * sideW;
  const photoH = A5_LANDSCAPE_H - 2 * pad;

  drawImageCover(page, heroImg, photoX, photoY, photoW, photoH);

  const nameUpper = opts.displayName.trim().toUpperCase() || 'NAAM MODEL';
  const nameSize = nameUpper.length > 22 ? 8 : 10;
  drawVerticalNameLeft(page, fontBold, nameUpper, pad + 12, pad + 8, nameSize);

  if (opts.ageLabel) {
    const ageSize = 7;
    const ageW = font.widthOfTextAtSize(opts.ageLabel, ageSize);
    page.drawText(opts.ageLabel, {
      x: pad + 12,
      y: pad + 28 + ageW,
      size: ageSize,
      font,
      color: INK,
      rotate: degrees(90),
    });
  }

  drawVerticalAgencyRight(page, font, fontBold, A5_LANDSCAPE_W - pad - 10, A5_LANDSCAPE_H - pad - 6);

  return pdfDoc.save();
}

/**
 * Verso — A5 liggend: links kleinere foto’s (2×2 + één onder), rechts maten (geen naam).
 */
export async function buildSetCardVersoPdf(opts: {
  versoBytes: Buffer[];
  statEntries: StatEntry[];
}): Promise<Uint8Array> {
  const { versoBytes, statEntries } = opts;
  if (versoBytes.length !== 5) throw new Error('Precies 5 foto’s nodig voor de achterzijde.');

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A5_LANDSCAPE_W, A5_LANDSCAPE_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const thumbs: PDFImage[] = [];
  for (const b of versoBytes) thumbs.push(await embedRaster(pdfDoc, b));

  const pad = 10;
  const gap = 5;
  const statsW = 155;
  const photosX = pad;
  const photosY = pad;
  const photosW = A5_LANDSCAPE_W - 2 * pad - statsW - gap;
  const photosH = A5_LANDSCAPE_H - 2 * pad;
  const statsX = photosX + photosW + gap;

  const gridH = photosH * 0.7;
  const fifthH = photosH - gridH - gap;
  const cellW = (photosW - gap) / 2;
  const cellH = (gridH - gap) / 2;
  const row1Y = photosY + cellH + gap;
  const row2Y = photosY;

  drawImageCover(page, thumbs[0], photosX, row1Y, cellW, cellH);
  drawImageCover(page, thumbs[1], photosX + cellW + gap, row1Y, cellW, cellH);
  drawImageCover(page, thumbs[2], photosX, row2Y, cellW, cellH);
  drawImageCover(page, thumbs[3], photosX + cellW + gap, row2Y, cellW, cellH);
  drawImageCover(page, thumbs[4], photosX, photosY + gridH + gap, photosW, fifthH);

  drawStatBlock(page, font, statsX + 4, photosY + photosH - 8, statsW - 8, statEntries);

  return pdfDoc.save();
}

export async function buildModelSetCardPdfPair(opts: {
  heroBytes: Buffer;
  versoBytes: Buffer[];
  displayName: string;
  ageLabel: string | null;
  statEntries: StatEntry[];
}): Promise<{ recto: Uint8Array; verso: Uint8Array }> {
  const recto = await buildSetCardRectoPdf({
    heroBytes: opts.heroBytes,
    displayName: opts.displayName,
    ageLabel: opts.ageLabel,
  });
  const verso = await buildSetCardVersoPdf({
    versoBytes: opts.versoBytes,
    statEntries: opts.statEntries,
  });
  return { recto, verso };
}
