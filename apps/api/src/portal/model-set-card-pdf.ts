import { PDFDocument, StandardFonts, degrees, rgb, type PDFImage, type PDFFont, type PDFPage } from 'pdf-lib';
import sharp from 'sharp';

/** A5 landscape in pt (ISO). */
export const A5_LANDSCAPE_W = 595.28;
export const A5_LANDSCAPE_H = 419.53;

const BURGUNDY = rgb(0.46, 0.09, 0.14);
const INK = rgb(0.12, 0.12, 0.12);
const MUTED = rgb(0.35, 0.35, 0.35);
const PAGE_PAD = 8;
const SIDE_BAND = 52;

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
  add('Confectie', 'confectiemaat');
  add('Maat', 'maat');
  return entries;
}

/** Voor API-preview in portaal (tekstregels). */
export function modelSheetStatLines(ms: Record<string, unknown> | null): string[] {
  return modelSheetStatEntries(ms).map((e) => `${e.label}: ${e.value}`);
}

/** Verklein vóór PDF — voorkomt 504 timeouts op shared hosting. */
async function prepareJpegForPdf(bytes: Buffer): Promise<Buffer> {
  return sharp(bytes)
    .rotate()
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}

async function embedRaster(pdfDoc: PDFDocument, bytes: Buffer): Promise<PDFImage> {
  const jpeg = await prepareJpegForPdf(bytes);
  return pdfDoc.embedJpg(jpeg);
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

function drawStatColumn(
  page: PDFPage,
  font: PDFFont,
  x: number,
  yTop: number,
  width: number,
  height: number,
  entries: StatEntry[],
) {
  const rowH = 14;
  const labelSize = 9;
  const valueSize = 9;
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

/** Voorzijde — zoals voorbeeld: grote foto, naam links verticaal, bureau rechts verticaal. */
export async function buildSetCardRectoPdf(opts: {
  heroBytes: Buffer;
  displayName: string;
  ageLabel: string | null;
}): Promise<Uint8Array> {
  const { heroBytes, displayName } = opts;
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A5_LANDSCAPE_W, A5_LANDSCAPE_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const heroImg = await embedRaster(pdfDoc, heroBytes);

  const photoX = PAGE_PAD + SIDE_BAND;
  const photoY = PAGE_PAD;
  const photoW = A5_LANDSCAPE_W - 2 * PAGE_PAD - 2 * SIDE_BAND;
  const photoH = A5_LANDSCAPE_H - 2 * PAGE_PAD;

  drawImageCover(page, heroImg, photoX, photoY, photoW, photoH);

  const nameUpper = displayName.trim().toUpperCase() || 'NAAM MODEL';
  const nameSize = Math.min(11, nameUpper.length > 20 ? 8 : 11);
  const nameW = fontBold.widthOfTextAtSize(nameUpper, nameSize);
  page.drawText(nameUpper, {
    x: PAGE_PAD + 16,
    y: (A5_LANDSCAPE_H + nameW) / 2,
    size: nameSize,
    font: fontBold,
    color: BURGUNDY,
    rotate: degrees(90),
  });

  if (opts.ageLabel) {
    const ageText = opts.ageLabel;
    const ageSize = 7;
    const ageW = font.widthOfTextAtSize(ageText, ageSize);
    page.drawText(ageText, {
      x: PAGE_PAD + 30,
      y: (A5_LANDSCAPE_H + ageW) / 2 - nameW - 12,
      size: ageSize,
      font,
      color: INK,
      rotate: degrees(90),
    });
  }

  const rx = A5_LANDSCAPE_W - PAGE_PAD - 12;
  let ry = A5_LANDSCAPE_H - PAGE_PAD - 8;
  for (let i = AGENCY_LINES.length - 1; i >= 0; i--) {
    const line = AGENCY_LINES[i];
    const isBold = i === 0;
    const size = isBold ? 8 : 6.5;
    const f = isBold ? fontBold : font;
    const lw = f.widthOfTextAtSize(line, size);
    page.drawText(line, {
      x: rx,
      y: ry,
      size,
      font: f,
      color: isBold ? INK : MUTED,
      rotate: degrees(-90),
    });
    ry -= lw + 6;
  }

  return pdfDoc.save();
}

/** Achterzijde — 5 foto's + maten (geen naam), label links / waarde rechts. */
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
  for (const b of versoBytes) {
    thumbs.push(await embedRaster(pdfDoc, b));
  }

  const gap = 4;
  const statsW = 128;
  const gridX = PAGE_PAD;
  const gridY = PAGE_PAD;
  const gridW = A5_LANDSCAPE_W - 2 * PAGE_PAD - statsW - gap;
  const gridH = A5_LANDSCAPE_H - 2 * PAGE_PAD;
  const statsX = gridX + gridW + gap;

  const row1H = (gridH - gap) * 0.52;
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
