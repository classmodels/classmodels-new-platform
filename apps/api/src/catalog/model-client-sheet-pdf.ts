import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import sharp from 'sharp';

/** A4 portrait (pt). */
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 28;

const INK = rgb(0.12, 0.12, 0.12);
const MUTED = rgb(0.38, 0.38, 0.38);
const LINE = rgb(0.82, 0.82, 0.82);
const BOX_BG = rgb(0.97, 0.96, 0.95);
const BOX_BORDER = rgb(0.72, 0.55, 0.55);

const FOOTER_TITLE = 'Class-Models';
const FOOTER_ADDR = 'Provinciebaan 3, 2235 Hulshout';
const FOOTER_CONTACT = 'info@class-models.be  ·  +32 (0) 485 322 307  ·  www.class-models.be';

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

async function prepareJpeg(bytes: Buffer): Promise<Buffer> {
  return sharp(bytes)
    .rotate()
    .resize(1200, 1800, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
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
  page.drawText(text, { x, y, size, font, color });
}

function fitSize(font: PDFFont, text: string, maxW: number, start: number, min = 6): number {
  let size = start;
  while (size > min && font.widthOfTextAtSize(text, size) > maxW) size -= 0.25;
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
  const tw = font.widthOfTextAtSize(text, size);
  drawText(page, font, text, boxX + Math.max(0, (boxW - tw) / 2), y, size, color);
}

function drawAgencyBox(page: PDFPage, font: PDFFont, fontBold: PDFFont, yBottom: number) {
  const boxX = MARGIN;
  const boxW = PAGE_W - MARGIN * 2;
  const boxH = 52;
  const y = yBottom;
  page.drawRectangle({
    x: boxX,
    y,
    width: boxW,
    height: boxH,
    color: BOX_BG,
    borderColor: BOX_BORDER,
    borderWidth: 1.1,
  });
  drawCentered(page, fontBold, FOOTER_TITLE, boxX, boxW, y + 34, 10, INK);
  drawCentered(page, font, FOOTER_ADDR, boxX, boxW, y + 20, 8, MUTED);
  const contactSize = fitSize(font, FOOTER_CONTACT, boxW - 16, 7.5);
  drawCentered(page, font, FOOTER_CONTACT, boxX, boxW, y + 8, contactSize, MUTED);
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
): number {
  const labelSize = 6.5;
  const valueSize = 8;
  const lineH = 13;
  drawText(page, fontBold, label.toUpperCase(), x, y, labelSize, MUTED);
  const v = (value || '—').trim() || '—';
  const maxChars = Math.max(8, Math.floor(valW / (valueSize * 0.48)));
  const clipped = v.length > maxChars ? `${v.slice(0, maxChars - 1)}…` : v;
  drawText(page, font, clipped, x + labW, y, valueSize, INK);
  page.drawLine({
    start: { x, y: y - 3.5 },
    end: { x: x + labW + valW, y: y - 3.5 },
    thickness: 0.35,
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
    const contentBottom = MARGIN + 60;
    const contentTop = PAGE_H - MARGIN;
    const gap = 18;
    const photoW = (PAGE_W - MARGIN * 2 - gap) * 0.46;
    const infoX = MARGIN + photoW + gap;
    const infoW = PAGE_W - MARGIN - infoX;
    const photoH = contentTop - contentBottom - 8;

    let img: PDFImage | null = null;
    if (m.photoBytes?.length) {
      try {
        img = await pdfDoc.embedJpg(await prepareJpeg(m.photoBytes));
      } catch {
        img = null;
      }
    }

    if (img) {
      const sc = Math.min(photoW / img.width, photoH / img.height);
      const dw = img.width * sc;
      const dh = img.height * sc;
      const ix = MARGIN + (photoW - dw) / 2;
      const iy = contentBottom + (photoH - dh) / 2;
      page.drawImage(img, { x: ix, y: iy, width: dw, height: dh });
    } else {
      page.drawRectangle({
        x: MARGIN,
        y: contentBottom,
        width: photoW,
        height: photoH,
        color: rgb(0.94, 0.94, 0.94),
        borderColor: LINE,
        borderWidth: 0.5,
      });
      const initial = (m.displayName || '?').slice(0, 1).toUpperCase();
      drawCentered(page, fontBold, initial, MARGIN, photoW, contentBottom + photoH / 2 - 10, 28, MUTED);
    }

    const naam = (m.displayName || 'Model').trim() || 'Model';
    const agePart = m.age != null && Number.isFinite(m.age) ? `  ·  ${m.age} jaar` : '';
    const title = `${naam}${agePart}`;
    const titleSize = fitSize(fontBold, title, infoW, 14, 9);
    let y = contentTop - titleSize - 2;
    drawText(page, fontBold, title, infoX, y, titleSize, INK);
    y -= 16;

    const labW = infoW * 0.42;
    const valW = infoW - labW;
    const sh = m.sheet;
    const rows: [string, string][] = [
      ['Geslacht', genderNl(m.gender)],
      ['Gemeente', sheetStr(sh, 'gemeente')],
      ['Nationaliteit', sheetStr(sh, 'nationaliteit')],
      ['Lengte', sheetStr(sh, 'lengte')],
      ['Maat', sheetStr(sh, 'maat')],
      ['Confectiemaat', sheetStr(sh, 'confectiemaat')],
      ['Schoenmaat', sheetStr(sh, 'schoenmaat')],
      ['BH-maat', sheetStr(sh, 'bhMaat')],
      ['Borstomtrek', sheetStr(sh, 'borstomtrek')],
      ['Taille', sheetStr(sh, 'taille')],
      ['Heupomtrek', sheetStr(sh, 'heupomtrek')],
      ['Jeansmaat', sheetStr(sh, 'jeansmaat')],
      ['Haarkleur', sheetStr(sh, 'haarkleur')],
      ['Kleur ogen', sheetStr(sh, 'kleurOgen')],
      ['Beschikbaar voor', m.beschikbaar.length ? m.beschikbaar.join(', ') : '—'],
    ];

    for (const [lab, val] of rows) {
      if (y < contentBottom + 8) break;
      y = drawRow(page, font, fontBold, lab, val, infoX, y, labW, valW);
    }

    drawAgencyBox(page, font, fontBold, MARGIN);
  }

  return pdfDoc.save();
}
