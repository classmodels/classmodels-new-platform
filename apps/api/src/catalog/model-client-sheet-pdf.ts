import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import sharp from 'sharp';

/** A4 portrait (pt). */
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 22;

const INK = rgb(0.12, 0.12, 0.12);
const MUTED = rgb(0.38, 0.38, 0.38);
const LINE = rgb(0.82, 0.82, 0.82);
const BOX_BG = rgb(0.97, 0.96, 0.95);
const BOX_BORDER = rgb(0.72, 0.55, 0.55);

const FOOTER_TITLE = 'Class-Models';
const FOOTER_ADDR = 'Provinciebaan 3, 2235 Hulshout';
const FOOTER_CONTACT = 'info@class-models.be  ·  +32 (0) 485 322 307  ·  www.class-models.be';
const FOOTER_H = 46;
const FOOTER_GAP = 10;

export type ClientSheetPdfModel = {
  displayName: string;
  age: number | null;
  gender: '' | 'man' | 'vrouw';
  beschikbaar: string[];
  sheet: Record<string, unknown> | null;
  photoBytes: Buffer | null;
};

function sheetStr(sh: Record<string, unknown> | null | undefined, key: string): string {
  if (!sh) return '';
  const v = sh[key];
  if (v == null) return '';
  return String(v).trim();
}

function genderNl(g: '' | 'man' | 'vrouw'): string {
  if (g === 'man') return 'Man';
  if (g === 'vrouw') return 'Vrouw';
  return '—';
}

async function prepareJpegContain(bytes: Buffer, maxW: number, maxH: number): Promise<Buffer> {
  const w = Math.max(200, Math.round(maxW));
  const h = Math.max(200, Math.round(maxH));
  return sharp(bytes)
    .rotate()
    .resize(w, h, { fit: 'inside', withoutEnlargement: false })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

function winAnsiSafe(text: string): string {
  // Helvetica/WinAnsi = Latin-1; behoud é/ë/…, strip alleen buiten Latin-1.
  return Array.from(text.normalize('NFC'))
    .map((ch) => (ch.codePointAt(0)! <= 0xff ? ch : '?'))
    .join('');
}

function drawText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  size: number,
  color = INK,
) {
  page.drawText(winAnsiSafe(text), { x, y, size, font, color });
}

function fitSize(font: PDFFont, text: string, maxW: number, start: number, min = 6): number {
  let size = start;
  const safe = winAnsiSafe(text);
  while (size > min && font.widthOfTextAtSize(safe, size) > maxW) size -= 0.25;
  return size;
}

function drawCentered(
  page: PDFPage,
  font: PDFFont,
  text: string,
  boxX: number,
  boxW: number,
  y: number,
  size: number,
  color = INK,
) {
  const safe = winAnsiSafe(text);
  const tw = font.widthOfTextAtSize(safe, size);
  drawText(page, font, text, boxX + Math.max(0, (boxW - tw) / 2), y, size, color);
}

function drawAgencyBox(page: PDFPage, font: PDFFont, fontBold: PDFFont, yBottom: number) {
  const boxX = MARGIN;
  const boxW = PAGE_W - MARGIN * 2;
  page.drawRectangle({
    x: boxX,
    y: yBottom,
    width: boxW,
    height: FOOTER_H,
    color: BOX_BG,
    borderColor: BOX_BORDER,
    borderWidth: 1,
  });
  drawCentered(page, fontBold, FOOTER_TITLE, boxX, boxW, yBottom + 30, 9.5, INK);
  drawCentered(page, font, FOOTER_ADDR, boxX, boxW, yBottom + 17, 7.5, MUTED);
  const contactSize = fitSize(font, FOOTER_CONTACT, boxW - 14, 7);
  drawCentered(page, font, FOOTER_CONTACT, boxX, boxW, yBottom + 6, contactSize, MUTED);
}

function drawRow(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  label: string,
  value: string,
  x: number,
  y: number,
  labW: number,
  valW: number,
  lineH: number,
): number {
  const labelSize = 6;
  const valueSize = 7.5;
  drawText(page, fontBold, label.toUpperCase(), x, y, labelSize, MUTED);
  const v = (value || '—').trim() || '—';
  const maxChars = Math.max(10, Math.floor(valW / (valueSize * 0.46)));
  const clipped = v.length > maxChars ? `${v.slice(0, maxChars - 1)}…` : v;
  drawText(page, font, clipped, x + labW, y, valueSize, INK);
  page.drawLine({
    start: { x, y: y - 2.8 },
    end: { x: x + labW + valW, y: y - 2.8 },
    thickness: 0.3,
    color: LINE,
  });
  return y - lineH;
}

export async function buildClientModelSheetsPdf(models: ClientSheetPdfModel[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const m of models) {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    const footerY = MARGIN;
    const contentBottom = footerY + FOOTER_H + FOOTER_GAP;
    const contentTop = PAGE_H - MARGIN;
    const mainH = contentTop - contentBottom;
    const gap = 14;
    const photoW = 248;
    const infoX = MARGIN + photoW + gap;
    const infoW = PAGE_W - MARGIN - infoX;

    const naam = (m.displayName || 'Model').trim() || 'Model';
    const agePart = m.age != null && Number.isFinite(m.age) ? `  ·  ${m.age} jaar` : '';
    const title = `${naam}${agePart}`;
    const titleSize = fitSize(fontBold, title, infoW, 13, 9);
    const lineH = 11.2;
    const rows: [string, string][] = [
      ['Geslacht', genderNl(m.gender)],
      ['Gemeente', sheetStr(m.sheet, 'gemeente')],
      ['Nationaliteit', sheetStr(m.sheet, 'nationaliteit')],
      ['Lengte', sheetStr(m.sheet, 'lengte')],
      ['Maat', sheetStr(m.sheet, 'maat')],
      ['Confectiemaat', sheetStr(m.sheet, 'confectiemaat')],
      ['Schoenmaat', sheetStr(m.sheet, 'schoenmaat')],
      ['BH-maat', sheetStr(m.sheet, 'bhMaat')],
      ['Borstomtrek', sheetStr(m.sheet, 'borstomtrek')],
      ['Taille', sheetStr(m.sheet, 'taille')],
      ['Heupomtrek', sheetStr(m.sheet, 'heupomtrek')],
      ['Jeansmaat', sheetStr(m.sheet, 'jeansmaat')],
      ['Haarkleur', sheetStr(m.sheet, 'haarkleur')],
      ['Kleur ogen', sheetStr(m.sheet, 'kleurOgen')],
      ['Beschikbaar voor', m.beschikbaar.length ? m.beschikbaar.join(', ') : '—'],
    ];
    // Max hoogte tot boven het bedrijfskader; breedte = linkerkolom.
    const photoMaxH = mainH;

    let img: PDFImage | null = null;
    if (m.photoBytes?.length) {
      try {
        // Volledige foto, juiste verhouding — niets afkappen.
        const jpeg = await prepareJpegContain(m.photoBytes, photoW * 3, photoMaxH * 3);
        img = await pdfDoc.embedJpg(jpeg);
      } catch {
        img = null;
      }
    }

    // Foto links bovenaan: kolombreedte, hoogte in verhouding (contain).
    if (img) {
      const sc = Math.min(photoW / img.width, photoMaxH / img.height);
      const dw = img.width * sc;
      const dh = img.height * sc;
      const ix = MARGIN + (photoW - dw) / 2;
      const iy = contentTop - dh;
      page.drawImage(img, { x: ix, y: iy, width: dw, height: dh });
    } else {
      const ph = Math.min(photoMaxH, photoW * 1.35);
      page.drawRectangle({
        x: MARGIN,
        y: contentTop - ph,
        width: photoW,
        height: ph,
        color: rgb(0.94, 0.94, 0.94),
        borderColor: LINE,
        borderWidth: 0.5,
      });
      const initial = (m.displayName || '?').slice(0, 1).toUpperCase();
      drawCentered(page, fontBold, initial, MARGIN, photoW, contentTop - ph / 2 - 10, 28, MUTED);
    }

    let y = contentTop - titleSize;
    drawText(page, fontBold, title, infoX, y, titleSize, INK);
    y -= titleSize + 8;

    const labW = infoW * 0.4;
    const valW = infoW - labW;
    for (const [lab, val] of rows) {
      if (y < contentBottom + 4) break;
      y = drawRow(page, font, fontBold, lab, val, infoX, y, labW, valW, lineH);
    }

    drawAgencyBox(page, font, fontBold, footerY);
  }

  return pdfDoc.save();
}
