import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import sharp from 'sharp';

/** A5 landscape in pt (ISO), beide pagina's gelijk voor duplex-print. */
export const A5_LANDSCAPE_W = 595.28;
export const A5_LANDSCAPE_H = 419.53;

const BURGUNDY = rgb(0.46, 0.09, 0.14);
const INK = rgb(0.12, 0.12, 0.12);
const MUTED = rgb(0.35, 0.35, 0.35);

const AGENCY_LINES = [
  'Class-Models',
  'Provinciebaan 3, 2235 Hulshout',
  'www.class-models.be  ·  info@class-models.be  ·  gsm +32 (0) 485 322 307',
];

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

export function modelSheetStatLines(ms: Record<string, unknown> | null): string[] {
  if (!ms) return [];
  const add = (label: string, key: string) => {
    const v = ms[key];
    if (v == null || v === '') return;
    const t = typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '';
    if (!t) return;
    lines.push(`${label}: ${t}`);
  };
  const lines: string[] = [];
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
  return lines;
}

async function embedRaster(pdfDoc: PDFDocument, bytes: Buffer) {
  const pngBuf = await sharp(bytes).rotate().png({ quality: 92 }).toBuffer();
  return pdfDoc.embedPng(pngBuf);
}

function drawFooter(page: ReturnType<PDFDocument['addPage']>, font: PDFFont, fontBold: PDFFont, yBottom: number) {
  let y = yBottom;
  const cx = A5_LANDSCAPE_W / 2;
  page.drawLine({
    start: { x: 48, y: y + 18 },
    end: { x: A5_LANDSCAPE_W - 48, y: y + 18 },
    thickness: 0.6,
    color: rgb(0.85, 0.85, 0.85),
  });
  y += 8;
  page.drawText(AGENCY_LINES[0], {
    x: cx - fontBold.widthOfTextAtSize(AGENCY_LINES[0], 11) / 2,
    y,
    size: 11,
    font: fontBold,
    color: INK,
  });
  y -= 13;
  for (let i = 1; i < AGENCY_LINES.length; i++) {
    const line = AGENCY_LINES[i];
    page.drawText(line, {
      x: cx - font.widthOfTextAtSize(line, 8) / 2,
      y,
      size: 8,
      font,
      color: MUTED,
    });
    y -= 11;
  }
}

/** Twee pagina's A5 landscape: voorzijde (held + naam + leeftijd), achterzijde (5 foto's + stats). */
export async function buildModelSetCardPdf(opts: {
  heroBytes: Buffer;
  versoBytes: Buffer[];
  displayName: string;
  ageLabel: string | null;
  statLines: string[];
}): Promise<Uint8Array> {
  const { heroBytes, versoBytes, displayName, ageLabel, statLines } = opts;
  if (versoBytes.length !== 5) throw new Error('Precies 5 foto’s nodig voor de achterzijde.');

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  /* --- Pagina 1 — voorzijde --- */
  const p1 = pdfDoc.addPage([A5_LANDSCAPE_W, A5_LANDSCAPE_H]);
  const heroImg = await embedRaster(pdfDoc, heroBytes);

  const margin = 36;
  const footerH = 72;
  const titleY = A5_LANDSCAPE_H - margin - 6;
  const nameUpper = displayName.trim().toUpperCase() || 'NAAM MODEL';
  const titleSize = Math.min(22, nameUpper.length > 22 ? 16 : 22);
  const tw = fontBold.widthOfTextAtSize(nameUpper, titleSize);
  p1.drawText(nameUpper, {
    x: (A5_LANDSCAPE_W - tw) / 2,
    y: titleY,
    size: titleSize,
    font: fontBold,
    color: BURGUNDY,
  });
  let subY = titleY - 18;
  if (ageLabel) {
    const ageText = `Leeftijd: ${ageLabel}`;
    const aw = font.widthOfTextAtSize(ageText, 10);
    p1.drawText(ageText, {
      x: (A5_LANDSCAPE_W - aw) / 2,
      y: subY,
      size: 10,
      font,
      color: INK,
    });
    subY -= 14;
  }

  const imgTop = subY - 10;
  const imgBottom = footerH + 14;
  const maxW = A5_LANDSCAPE_W - 2 * margin;
  const maxH = imgTop - imgBottom;
  const heroW = heroImg.width;
  const heroH = heroImg.height;
  const scale = Math.min(maxW / heroW, maxH / heroH);
  const dw = heroW * scale;
  const dh = heroH * scale;
  const ix = (A5_LANDSCAPE_W - dw) / 2;
  const iy = imgBottom + (maxH - dh) / 2;

  p1.drawRectangle({
    x: ix - 2,
    y: iy - 2,
    width: dw + 4,
    height: dh + 4,
    borderColor: rgb(0.9, 0.9, 0.9),
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });
  p1.drawImage(heroImg, { x: ix, y: iy, width: dw, height: dh });

  drawFooter(p1, font, fontBold, 14);

  /* --- Pagina 2 — achterzijde --- */
  const p2 = pdfDoc.addPage([A5_LANDSCAPE_W, A5_LANDSCAPE_H]);
  const thumbs = await Promise.all(versoBytes.map((b) => embedRaster(pdfDoc, b)));

  const leftPad = 32;
  const statsW = 168;
  const gridRight = A5_LANDSCAPE_W - statsW - leftPad - 14;
  const cellGap = 8;
  const bandTop = A5_LANDSCAPE_H - 38;
  const row1H = 118;
  const row1Bottom = bandTop - row1H;
  const colW = (gridRight - leftPad - 2 * cellGap) / 3;
  let x = leftPad;
  for (let i = 0; i < 3; i++) {
    const img = thumbs[i];
    const sc = Math.min(colW / img.width, row1H / img.height);
    const w = img.width * sc;
    const h = img.height * sc;
    const ox = x + (colW - w) / 2;
    const oy = row1Bottom + (row1H - h) / 2;
    p2.drawRectangle({
      x: ox - 1,
      y: oy - 1,
      width: w + 2,
      height: h + 2,
      borderColor: rgb(0.88, 0.88, 0.88),
      borderWidth: 0.8,
    });
    p2.drawImage(img, { x: ox, y: oy, width: w, height: h });
    x += colW + cellGap;
  }

  const rowGap = 12;
  const row2H = 118;
  const row2Top = row1Bottom - rowGap;
  const row2Bottom = row2Top - row2H;
  const twoColW = (gridRight - leftPad - cellGap) / 2;
  x = leftPad;
  for (let i = 3; i < 5; i++) {
    const img = thumbs[i];
    const sc = Math.min(twoColW / img.width, row2H / img.height);
    const w = img.width * sc;
    const h = img.height * sc;
    const ox = x + (twoColW - w) / 2;
    const oy = row2Bottom + (row2H - h) / 2;
    p2.drawRectangle({
      x: ox - 1,
      y: oy - 1,
      width: w + 2,
      height: h + 2,
      borderColor: rgb(0.88, 0.88, 0.88),
      borderWidth: 0.8,
    });
    p2.drawImage(img, { x: ox, y: oy, width: w, height: h });
    x += twoColW + cellGap;
  }

  const sx = gridRight + 14;
  let sy = bandTop - 4;
  const head = `NAAM: ${displayName.trim().toUpperCase()}`;
  p2.drawText(head, { x: sx, y: sy, size: 9, font: fontBold, color: INK });
  sy -= 16;
  const lnSize = 8.5;
  for (const line of statLines.slice(0, 18)) {
    if (sy < footerH + 40) break;
    const chunks =
      line.length > 42 ? [`${line.slice(0, 42)}`, line.slice(42)] : [line];
    for (const c of chunks) {
      p2.drawText(c, { x: sx, y: sy, size: lnSize, font, color: INK });
      sy -= lnSize + 2;
    }
  }

  drawFooter(p2, font, fontBold, 14);

  return pdfDoc.save();
}
