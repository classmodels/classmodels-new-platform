import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFFont, type PDFPage } from 'pdf-lib';
import sharp from 'sharp';

/** A5 landscape in pt (ISO). */
export const A5_LANDSCAPE_W = 595.28;
export const A5_LANDSCAPE_H = 419.53;

const BURGUNDY = rgb(0.46, 0.09, 0.14);
const INK = rgb(0.12, 0.12, 0.12);
const MUTED = rgb(0.35, 0.35, 0.35);
const PAGE_PAD = 10;

const AGENCY_LINE1 = 'Class-Models';
const AGENCY_LINE2 =
  'Provinciebaan 3, 2235 Hulshout  |  www.class-models.be  |  info@class-models.be  |  gsm +32 (0) 485 322 307';

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
  add('BH-maat', 'bhMaat');
  add('Borstomtrek', 'borstomtrek');
  add('Taille', 'taille');
  add('Heupomtrek', 'heupomtrek');
  add('Confectiemaat', 'confectiemaat');
  add('Jeansmaat', 'jeansmaat');
  add('Schoenmaat', 'schoenmaat');
  add('Haarkleur', 'haarkleur');
  add('Kleur ogen', 'kleurOgen');
  add('Maat', 'maat');
  return entries;
}

/** Voor API-preview in portaal (tekstregels). */
export function modelSheetStatLines(ms: Record<string, unknown> | null): string[] {
  return modelSheetStatEntries(ms).map((e) => `${e.label}: ${e.value}`);
}

async function embedRaster(pdfDoc: PDFDocument, bytes: Buffer): Promise<PDFImage> {
  const pngBuf = await sharp(bytes).rotate().png({ quality: 92 }).toBuffer();
  return pdfDoc.embedPng(pngBuf);
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

function fitFontSize(
  font: PDFFont,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
): number {
  let size = startSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.25;
  }
  return size;
}

/** Bureau op twee regels, breedte = `width`, linkerrand = `x`. */
function drawAgencyBlock(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  x: number,
  width: number,
  yTop: number,
) {
  const line1Size = 11;
  const w1 = fontBold.widthOfTextAtSize(AGENCY_LINE1, line1Size);
  page.drawText(AGENCY_LINE1, {
    x: x + (width - w1) / 2,
    y: yTop - line1Size,
    size: line1Size,
    font: fontBold,
    color: INK,
  });

  const line2Size = fitFontSize(font, AGENCY_LINE2, width, 7.5, 5);
  const w2 = font.widthOfTextAtSize(AGENCY_LINE2, line2Size);
  page.drawText(AGENCY_LINE2, {
    x: x + (width - w2) / 2,
    y: yTop - line1Size - 4 - line2Size,
    size: line2Size,
    font,
    color: MUTED,
  });
}

function drawStatColumn(
  page: PDFPage,
  font: PDFFont,
  x: number,
  yTop: number,
  width: number,
  height: number,
  entries: StatEntry[],
) {
  const rowH = 13;
  const labelSize = 8.5;
  const valueSize = 8.5;
  const maxRows = Math.floor(height / rowH);
  let y = yTop;

  for (const entry of entries.slice(0, maxRows)) {
    const label = `${entry.label}:`;
    page.drawText(label, {
      x,
      y: y - labelSize,
      size: labelSize,
      font,
      color: INK,
    });
    const vw = font.widthOfTextAtSize(entry.value, valueSize);
    page.drawText(entry.value, {
      x: x + width - vw,
      y: y - valueSize,
      size: valueSize,
      font,
      color: INK,
    });
    y -= rowH;
  }
}

/** Voorzijde — één A5 landscape: foto vullend, naam, bureau in 2 regels onder foto. */
export async function buildSetCardRectoPdf(opts: {
  heroBytes: Buffer;
  displayName: string;
  ageLabel: string | null;
}): Promise<Uint8Array> {
  const { heroBytes, displayName, ageLabel } = opts;
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A5_LANDSCAPE_W, A5_LANDSCAPE_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const heroImg = await embedRaster(pdfDoc, heroBytes);

  const contentW = A5_LANDSCAPE_W - 2 * PAGE_PAD;
  const contentX = PAGE_PAD;

  const nameUpper = displayName.trim().toUpperCase() || 'NAAM MODEL';
  const titleSize = Math.min(20, nameUpper.length > 24 ? 14 : 20);
  const titleBand = ageLabel ? 38 : 28;

  const agencyBand = 32;
  const photoBottom = PAGE_PAD + agencyBand;
  const photoTop = A5_LANDSCAPE_H - PAGE_PAD - titleBand;
  const photoH = photoTop - photoBottom;

  const tw = fontBold.widthOfTextAtSize(nameUpper, titleSize);
  page.drawText(nameUpper, {
    x: (A5_LANDSCAPE_W - tw) / 2,
    y: A5_LANDSCAPE_H - PAGE_PAD - titleSize,
    size: titleSize,
    font: fontBold,
    color: BURGUNDY,
  });
  if (ageLabel) {
    const ageText = `Leeftijd: ${ageLabel}`;
    const aw = font.widthOfTextAtSize(ageText, 9);
    page.drawText(ageText, {
      x: (A5_LANDSCAPE_W - aw) / 2,
      y: A5_LANDSCAPE_H - PAGE_PAD - titleSize - 12,
      size: 9,
      font,
      color: INK,
    });
  }

  drawImageCover(page, heroImg, contentX, photoBottom, contentW, photoH);
  drawAgencyBlock(page, font, fontBold, contentX, contentW, PAGE_PAD + agencyBand);

  return pdfDoc.save();
}

/** Achterzijde — één A5 landscape: 5 foto's + maten (geen naam), bureau 2 regels onderaan. */
export async function buildSetCardVersoPdf(opts: {
  versoBytes: Buffer[];
  statEntries: StatEntry[];
}): Promise<Uint8Array> {
  const { versoBytes, statEntries } = opts;
  if (versoBytes.length !== 5) throw new Error('Precies 5 foto’s nodig voor de achterzijde.');

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A5_LANDSCAPE_W, A5_LANDSCAPE_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const thumbs = await Promise.all(versoBytes.map((b) => embedRaster(pdfDoc, b)));

  const agencyBand = 32;
  const gap = 5;
  const statsW = 118;
  const gridX = PAGE_PAD;
  const gridY = PAGE_PAD + agencyBand;
  const gridW = A5_LANDSCAPE_W - 2 * PAGE_PAD - statsW - gap;
  const gridH = A5_LANDSCAPE_H - PAGE_PAD - agencyBand - PAGE_PAD;
  const statsX = gridX + gridW + gap;

  const row1H = (gridH - gap) * 0.55;
  const row2H = gridH - gap - row1H;
  const row1Y = gridY + row2H + gap;
  const row2Y = gridY;
  const col3W = (gridW - 2 * gap) / 3;
  const col2W = (gridW - gap) / 2;

  for (let i = 0; i < 3; i++) {
    drawImageCover(page, thumbs[i], gridX + i * (col3W + gap), row1Y, col3W, row1H);
  }
  drawImageCover(page, thumbs[3], gridX, row2Y, col2W, row2H);
  drawImageCover(page, thumbs[4], gridX + col2W + gap, row2Y, col2W, row2H);

  drawStatColumn(page, font, statsX, gridY + gridH, statsW, gridH, statEntries);

  drawAgencyBlock(page, font, fontBold, PAGE_PAD, A5_LANDSCAPE_W - 2 * PAGE_PAD, PAGE_PAD + agencyBand);

  return pdfDoc.save();
}

export async function buildModelSetCardPdfPair(opts: {
  heroBytes: Buffer;
  versoBytes: Buffer[];
  displayName: string;
  ageLabel: string | null;
  statEntries: StatEntry[];
}): Promise<{ recto: Uint8Array; verso: Uint8Array }> {
  const [recto, verso] = await Promise.all([
    buildSetCardRectoPdf({
      heroBytes: opts.heroBytes,
      displayName: opts.displayName,
      ageLabel: opts.ageLabel,
    }),
    buildSetCardVersoPdf({
      versoBytes: opts.versoBytes,
      statEntries: opts.statEntries,
    }),
  ]);
  return { recto, verso };
}
