import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';

function wrapLine(font: PDFFont, text: string, maxWidth: number, size: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Eenvoudige tekst-PDF (zakelijk leesbaar) voor contract/prototype. */
export async function buildContractPdfFromLines(lines: string[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const size = 10;
  const margin = 48;
  const maxW = 520;
  const lineH = 12;
  let page = pdfDoc.addPage([595, 842]);
  let y = 792;

  const newPage = () => {
    page = pdfDoc.addPage([595, 842]);
    y = 792;
  };

  for (const raw of lines) {
    const parts = raw.split('\n');
    for (const part of parts) {
      for (const line of wrapLine(font, part, maxW, size)) {
        if (y < margin + lineH) newPage();
        page.drawText(line, { x: margin, y, size, font, color: rgb(0.12, 0.12, 0.12) });
        y -= lineH;
      }
      y -= 4;
    }
  }

  return pdfDoc.save();
}
