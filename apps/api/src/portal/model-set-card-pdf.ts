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

const FOOTER_LINE_1 = 'Class-Models  ·  Provinciebaan 3, 2235 Hulshout  ·  www.class-models.be';
const FOOTER_LINE_2 = 'info@class-models.be  ·  gsm +32 (0) 485 322 307';

/** Zelfde opties als modellenfiche in portaal. */
const BESCHIKBAAR_LABELS: Record<string, string> = {
  Modeshows: 'modeshows',
  'Foto opdrachten': 'Foto opdrachten',
  Reklame: 'Reclame',
  'Host/hostess': 'Host / Hostess',
  'Lingerie/Bikini': 'Lingerie',
  'Artistiek naakt': 'Artistiek naakt',
  kleding: 'Kleding',
  lingerie: 'Lingerie',
  modeshows: 'modeshows',
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
    .map((x) => {
      const k = String(x).trim();
      return BESCHIKBAAR_LABELS[k] ?? k;
    })
    .filter(Boolean);
  if (!parts.length) return '';
  return `${parts.join(' - ')} -`;
}

function formatStatValue(label: string, raw: string): string {
  const v = raw.trim();
  if (!v) return v;
  if (label === 'Schoenen' || label === 'Maat') return v;
  if (/cm$/i.test(v)) return v;
  if (/^\d+([.,]\d+)?$/.test(v)) return `${v} cm`;
  return v;
}

export function modelSheetStatEntries(ms: Record<string, unknown> | null): StatEntry[] {
  if (!ms) return [];
  const entries: StatEntry[] = [];
  const add = (label: string, key: string, altKeys: string[] = []) => {
    const keys = [key, ...altKeys];
    let raw: unknown;
    for (const k of keys) {
      if (ms[k] != null && ms[k] !== '') {
        raw = ms[k];
        break;
      }
    }
    if (raw == null || raw === '') return;
    const t = typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim() : '';
    if (!t) return;
    entries.push({ label, value: formatStatValue(label, t) });
  };
  add('Lengte', 'lengte');
  add('Borst', 'borstomtrek', ['borst']);
  add('Taille', 'taille');
  add('Heupen', 'heupomtrek', ['heupen']);
  add('Schoenen', 'schoenmaat');
  add('Haar', 'haarkleur', ['haar']);
  add('Ogen', 'kleurOgen', ['ogen', 'kleur_ogen']);
  add('Maat', 'confectiemaat');
  if (!entries.some((e) => e.label === 'Maat')) add('Maat', 'maat');
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

function drawStatsWithRails(
  page: PDFPage,
  font: PDFFont,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  entries: StatEntry[],
) {
  const yTop = boxY + boxH;
  const yBottom = boxY;
  page.drawLine({
    start: { x: boxX, y: yBottom },
    end: { x: boxX, y: yTop },
    thickness: 1.2,
    color: BURGUNDY,
  });
  page.drawLine({
    start: { x: boxX + boxW, y: yBottom },
    end: { x: boxX + boxW, y: yTop },
    thickness: 1.2,
    color: BURGUNDY,
  });

  const size = 9;
  const rowH = 13.5;
  const padX = 10;
  let y = yTop - 12;

  const rows = entries.length > 0 ? entries : [{ label: '—', value: 'Vul maten in je profiel' }];
  for (const entry of rows) {
    page.drawText(entry.label, { x: boxX + padX, y: y - size, size, font, color: INK });
    const vw = font.widthOfTextAtSize(entry.value, size);
    page.drawText(entry.value, {
      x: boxX + boxW - padX - vw,
      y: y - size,
      size,
      font,
      color: INK,
    });
    y -= rowH;
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
 * Verso — A5 liggend: maten linksboven, 3 grotere foto’s (onderkant = grote foto), rechts grote foto.
 */
export async function buildSetCardVersoPdf(opts: {
  versoBytes: Buffer[];
  statEntries: StatEntry[];
  birthYear: string | null;
  beschikbaarLine: string;
}): Promise<Uint8Array> {
  const { versoBytes, statEntries, birthYear, beschikbaarLine } = opts;
  if (versoBytes.length !== VERSO_PHOTO_COUNT) {
    throw new Error(`Precies ${VERSO_PHOTO_COUNT} foto’s nodig voor de achterzijde.`);
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A5_LANDSCAPE_W, A5_LANDSCAPE_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const thumbs: PDFImage[] = [];
  for (const b of versoBytes) thumbs.push(await embedRaster(pdfDoc, b));

  const pad = 12;
  const footerH = 42;
  const geboorteRowH = 13;
  const colGap = 8;

  const contentW = A5_LANDSCAPE_W - 2 * pad;
  const leftW = contentW * 0.48;
  const rightX = pad + leftW + colGap;
  const rightW = A5_LANDSCAPE_W - pad - rightX;

  const photosBottom = pad + footerH + geboorteRowH;
  const contentTop = A5_LANDSCAPE_H - pad;

  const rowCount = Math.max(statEntries.length, 1);
  const statsH = Math.min(120, rowCount * 13.5 + 18);
  const statsBottom = contentTop - statsH - 10;
  const photoH = statsBottom - photosBottom - 8;

  drawStatsWithRails(page, font, pad, statsBottom, leftW, statsH, statEntries);

  const thumbGap = 8;
  const thumbW = (leftW - 2 * thumbGap) / 3;
  for (let i = 0; i < 3; i++) {
    drawImageContain(
      page,
      thumbs[i],
      pad + i * (thumbW + thumbGap),
      photosBottom,
      thumbW,
      photoH,
    );
  }

  drawImageContain(page, thumbs[3], rightX, photosBottom, rightW, photoH);

  const gebY = pad + footerH + 2;
  page.drawText('geboortejaar', { x: rightX, y: gebY, size: 7.5, font, color: MUTED });
  if (birthYear) {
    const yw = font.widthOfTextAtSize(birthYear, 8);
    page.drawText(birthYear, {
      x: rightX + rightW - yw,
      y: gebY,
      size: 8,
      font,
      color: INK,
    });
  }

  drawVersoBottomFooter(page, font, pad, contentW, pad, beschikbaarLine);

  return pdfDoc.save();
}

export async function buildModelSetCardPdfPair(opts: {
  heroBytes: Buffer;
  versoBytes: Buffer[];
  displayName: string;
  statEntries: StatEntry[];
  birthYear: string | null;
  beschikbaarLine: string;
}): Promise<{ recto: Uint8Array; verso: Uint8Array }> {
  const recto = await buildSetCardRectoPdf({
    heroBytes: opts.heroBytes,
    displayName: opts.displayName,
  });
  const verso = await buildSetCardVersoPdf({
    versoBytes: opts.versoBytes,
    statEntries: opts.statEntries,
    birthYear: opts.birthYear,
    beschikbaarLine: opts.beschikbaarLine,
  });
  return { recto, verso };
}
