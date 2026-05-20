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

const BESCHIKBAAR_LABELS: Record<string, string> = {
  kleding: 'Kleding',
  lingerie: 'Lingerie',
  'lingerie/bikini': 'Lingerie',
  modeshows: 'modeshows',
  'Foto opdrachten': 'Foto opdrachten',
  Reklame: 'Reclame',
  'Host/hostess': 'Host / Hostess',
  'Lingerie/Bikini': 'Lingerie',
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
  if (!Array.isArray(raw) || raw.length === 0) {
    return 'Kleding - Lingerie - modeshows -';
  }
  const parts = raw
    .map((x) => {
      const k = String(x).trim();
      return BESCHIKBAAR_LABELS[k] ?? k;
    })
    .filter(Boolean);
  if (!parts.length) return 'Kleding - Lingerie - modeshows -';
  return `${parts.join(' - ')} -`;
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

function drawFooterTwoLines(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  boxX: number,
  boxW: number,
  yBottom: number,
) {
  const lineGap = 12;
  const size1 = fitFontSize(fontBold, FOOTER_LINE_1, boxW, 7.5);
  const size2 = fitFontSize(font, FOOTER_LINE_2, boxW, 7.5);
  drawCenteredInBox(page, fontBold, FOOTER_LINE_1, boxX, boxW, yBottom + lineGap, size1, INK);
  drawCenteredInBox(page, font, FOOTER_LINE_2, boxX, boxW, yBottom, size2, MUTED);
}

/** Kader met hoeklijnen (zoals voorbeeld voorzijde). */
function drawPhotoFrame(page: PDFPage, x: number, y: number, w: number, h: number) {
  const t = 0.8;
  page.drawRectangle({ x, y, width: w, height: h, borderWidth: t, borderColor: INK });
  const c = 11;
  const lines: [number, number, number, number][] = [
    [x, y + h, x + c, y + h],
    [x, y + h, x, y + h - c],
    [x + w, y + h, x + w - c, y + h],
    [x + w, y + h, x + w, y + h - c],
    [x, y, x + c, y],
    [x, y, x, y + c],
    [x + w, y, x + w - c, y],
    [x + w, y, x + w, y + c],
  ];
  for (const [x1, y1, x2, y2] of lines) {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 1.4, color: INK });
  }
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
  const railInset = 6;
  const x1 = boxX;
  const x2 = boxX + boxW;
  const yTop = boxY + boxH;
  const yBottom = boxY;
  page.drawLine({
    start: { x: x1, y: yBottom },
    end: { x: x1, y: yTop },
    thickness: 1.2,
    color: BURGUNDY,
  });
  page.drawLine({
    start: { x: x2, y: yBottom },
    end: { x: x2, y: yTop },
    thickness: 1.2,
    color: BURGUNDY,
  });

  const size = 9;
  const rowH = 13.5;
  const padX = railInset + 4;
  let y = yTop - 10;

  for (const entry of entries) {
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
  page.drawText('Beschikbaar voor', { x: x + 2, y: yBase + 22, size, font, color: INK });
  page.drawLine({
    start: { x, y: yBase + 16 },
    end: { x: x + w, y: yBase + 16 },
    thickness: 0.6,
    color: MUTED,
  });
  const lineSize = fitFontSize(font, beschikbaarLine, w - 4, 8);
  page.drawText(beschikbaarLine, { x: x + 2, y: yBase + 4, size: lineSize, font, color: INK });
}

/**
 * Recto — A5 staand: naam, foto in kader (contain), footer 2 regels.
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

  const nameBlockH = 32;
  const footerBlockH = 34;
  const gap = 8;
  const framePad = 4;

  const photoX = margin;
  const photoW = contentW;
  const photoBottom = margin + footerBlockH + gap;
  const photoTop = A5_PORTRAIT_H - margin - nameBlockH - gap;
  const photoH = photoTop - photoBottom;

  const nameY = A5_PORTRAIT_H - margin - nameSize;
  const nameW = fontBold.widthOfTextAtSize(nameUpper, nameSize);
  page.drawText(nameUpper, {
    x: photoX + (photoW - nameW) / 2,
    y: nameY,
    size: nameSize,
    font: fontBold,
    color: BURGUNDY,
  });

  const frameX = photoX + framePad;
  const frameY = photoBottom + framePad;
  const frameW = photoW - 2 * framePad;
  const frameH = photoH - 2 * framePad;
  drawPhotoFrame(page, frameX, frameY, frameW, frameH);
  drawImageContain(page, heroImg, frameX + 2, frameY + 2, frameW - 4, frameH - 4);
  drawFooterTwoLines(page, font, fontBold, photoX, photoW, margin + 4);

  return pdfDoc.save();
}

/**
 * Verso — A5 liggend: links maten + 3 kleine foto’s, rechts grote foto, footer beschikbaarheid.
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
  const bottomH = 38;
  const gap = 6;
  const splitX = pad + (A5_LANDSCAPE_W - 2 * pad) * 0.5;
  const leftW = splitX - pad - gap / 2;
  const rightX = splitX + gap / 2;
  const rightW = A5_LANDSCAPE_W - pad - rightX;
  const mainTop = pad;
  const mainBottom = pad + bottomH;
  const mainH = A5_LANDSCAPE_H - mainTop - mainBottom;

  const statsH = Math.min(118, mainH * 0.42);
  const thumbsH = 88;
  const thumbsY = mainBottom + 8;
  const statsY = mainBottom + thumbsH + 14;

  drawStatsWithRails(page, font, pad, statsY, leftW, statsH, statEntries);

  const thumbGap = 5;
  const thumbW = (leftW - 2 * thumbGap) / 3;
  for (let i = 0; i < 3; i++) {
    drawImageContain(
      page,
      thumbs[i],
      pad + i * (thumbW + thumbGap),
      thumbsY,
      thumbW,
      thumbsH,
    );
  }

  const heroCaptionY = mainBottom + 2;
  page.drawText('geboortejaar', { x: rightX, y: heroCaptionY, size: 7.5, font, color: MUTED });
  if (birthYear) {
    const yw = font.widthOfTextAtSize(birthYear, 8);
    page.drawText(birthYear, {
      x: rightX + rightW - yw,
      y: heroCaptionY,
      size: 8,
      font,
      color: INK,
    });
  }

  const heroY = heroCaptionY + 12;
  const heroH = mainH - 14;
  drawImageContain(page, thumbs[3], rightX, heroY, rightW, heroH);

  drawVersoBottomFooter(page, font, pad, A5_LANDSCAPE_W - 2 * pad, pad, beschikbaarLine);

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
