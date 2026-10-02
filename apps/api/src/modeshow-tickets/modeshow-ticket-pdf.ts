import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import type { ModeshowEvent, ModeshowTicket, ModeshowTicketOrder } from '@prisma/client';
import { formatAddress, formatEventDateNl, formatEur, ticketTypeLabel, type TicketType } from './modeshow-ticket-utils';

const GOLD = rgb(0.76, 0.63, 0.39);
const INK = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.35, 0.32, 0.28);

export async function buildModeshowTicketsPdf(opts: {
  event: ModeshowEvent;
  order: ModeshowTicketOrder;
  tickets: ModeshowTicket[];
  claimBaseUrl: string;
}): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const owner = `${opts.order.firstName} ${opts.order.lastName}`.trim();
  const dateLabel = formatEventDateNl(opts.event.eventDate);
  const address = formatAddress(opts.event);
  const footer = (opts.event.ticketFooter || '').trim();

  let coverImage: Awaited<ReturnType<PDFDocument['embedPng']>> | null = null;
  const coverUrl = (opts.event.coverImageUrl || '').trim();
  if (coverUrl) {
    try {
      const res = await fetch(coverUrl);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('png') || coverUrl.toLowerCase().includes('.png')) {
          coverImage = await pdf.embedPng(buf);
        } else {
          coverImage = await pdf.embedJpg(buf);
        }
      }
    } catch {
      coverImage = null;
    }
  }

  for (const ticket of opts.tickets) {
    const page = pdf.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    const margin = 48;

    let topY = height - margin - 28;
    if (coverImage) {
      const maxW = width - 2 * margin;
      const maxH = 140;
      const scale = Math.min(maxW / coverImage.width, maxH / coverImage.height);
      const w = coverImage.width * scale;
      const h = coverImage.height * scale;
      page.drawImage(coverImage, {
        x: margin,
        y: height - margin - h,
        width: w,
        height: h,
      });
      topY = height - margin - h - 24;
    }

    page.drawRectangle({
      x: margin - 12,
      y: topY + 8,
      width: width - 2 * (margin - 12),
      height: 4,
      color: GOLD,
    });

    page.drawText('CLASS-MODELS', {
      x: margin,
      y: topY,
      size: 11,
      font: fontBold,
      color: GOLD,
    });
    page.drawText('MODESHOW TICKET', {
      x: margin,
      y: topY - 20,
      size: 22,
      font: fontBold,
      color: INK,
    });

    page.drawText(opts.event.title, {
      x: margin,
      y: topY - 56,
      size: 16,
      font: fontBold,
      color: INK,
      maxWidth: width - 2 * margin - 160,
    });

    const type = ticket.ticketType as TicketType;
    page.drawText(ticketTypeLabel(type), {
      x: margin,
      y: topY - 84,
      size: 13,
      font: fontBold,
      color: GOLD,
    });

    const lines: [string, string][] = [
      ['Naam', owner],
      ['Datum', dateLabel],
      ['Deuren', opts.event.doorsTime ? opts.event.doorsTime.slice(0, 5) : '—'],
      ['Aanvang', opts.event.startTime ? opts.event.startTime.slice(0, 5) : '—'],
      ['Locatie', address || '—'],
      ['Code', ticket.code],
    ];

    let y = topY - 122;
    for (const [label, value] of lines) {
      page.drawText(label.toUpperCase(), {
        x: margin,
        y,
        size: 8,
        font: fontBold,
        color: MUTED,
      });
      page.drawText(String(value).slice(0, 90), {
        x: margin,
        y: y - 16,
        size: 12,
        font,
        color: INK,
        maxWidth: width - 2 * margin - 160,
      });
      y -= 44;
    }

    const claimUrl = `${opts.claimBaseUrl.replace(/\/$/, '')}?code=${encodeURIComponent(ticket.code)}`;
    const qrPng = await QRCode.toBuffer(claimUrl, {
      type: 'png',
      width: 220,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
    const qrImage = await pdf.embedPng(qrPng);
    const qrSize = 130;
    page.drawImage(qrImage, {
      x: width - margin - qrSize,
      y: topY - 200,
      width: qrSize,
      height: qrSize,
    });
    page.drawText('Scan voor check-in', {
      x: width - margin - qrSize,
      y: topY - 216,
      size: 8,
      font,
      color: MUTED,
    });

    page.drawRectangle({
      x: margin - 12,
      y: 72,
      width: width - 2 * (margin - 12),
      height: 1,
      color: GOLD,
    });

    const footerText =
      footer ||
      'Bewaar dit ticket digitaal of print het. Toon de QR-code aan de ingang. · www.class-models.be';
    page.drawText(footerText.slice(0, 120), {
      x: margin,
      y: 52,
      size: 8,
      font,
      color: MUTED,
      maxWidth: width - 2 * margin,
    });
    page.drawText(formatEur(opts.order.totalAmount) + ` · bestelling ${opts.order.id.slice(0, 8)}`, {
      x: margin,
      y: 36,
      size: 8,
      font,
      color: MUTED,
    });
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
