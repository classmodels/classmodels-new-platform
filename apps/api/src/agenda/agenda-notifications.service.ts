import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export type AgendaConfirmationPayload = {
  toEmail: string | null;
  phone: string | null;
  displayName: string;
  calendarTitle: string;
  dateLabel: string;
  timeLabel: string;
  cancelUrl: string;
  confirmUrl: string;
};

@Injectable()
export class AgendaNotificationService {
  private readonly log = new Logger(AgendaNotificationService.name);

  /** Voorbeeld-HTML voor admin (zelfde template als echte mail). */
  previewBookingConfirmationHtml(): string {
    return this.buildEmailHtml({
      toEmail: 'voorbeeld@example.com',
      phone: '+32 470 00 00 00',
      displayName: 'Jan Janssens',
      calendarTitle: 'Portfolio afspraak',
      dateLabel: 'dinsdag 13 mei 2026',
      timeLabel: '10:00 – 10:30',
      cancelUrl: 'https://voorbeeld.be/portal/guest/annuleer?token=demo-token',
      confirmUrl: 'https://voorbeeld.be/portal/guest/bevestig?token=demo-token',
    });
  }

  /** Agenda + testshoot-docs: zelfde SMTP (`SMTP_HOST`, …). Retourneert false als niet geconfigureerd of geen adres. */
  async sendHtmlMail(to: string, subject: string, html: string): Promise<boolean> {
    return this.trySendSmtp(to, subject, html);
  }

  /** Zelfde SMTP met bijlagen (bv. PDF-contract). */
  async sendHtmlMailWithAttachments(
    to: string,
    subject: string,
    html: string,
    attachments: { filename: string; content: Buffer }[],
  ): Promise<boolean> {
    return this.trySendSmtp(to, subject, html, attachments);
  }

  async sendBookingConfirmation(p: AgendaConfirmationPayload): Promise<void> {
    const subject = `Bevestiging: ${p.calendarTitle} — Class Models`;
    const html = this.buildEmailHtml(p);
    const sms = this.buildSms(p);

    const mailed = await this.trySendSmtp(p.toEmail, subject, html);
    if (!mailed) {
      this.log.log(`E-mail (niet verstuurd — zet SMTP_HOST): ${subject} → ${p.toEmail ?? '(geen e-mail)'}`);
      this.log.debug(html);
    }
    this.log.log(`SMS → ${p.phone ?? '(geen GSM)'}\n${sms}`);
  }

  private async trySendSmtp(
    to: string | null,
    subject: string,
    html: string,
    attachments?: { filename: string; content: Buffer }[],
  ): Promise<boolean> {
    const addr = to?.trim();
    if (!addr) return false;

    const host = process.env.SMTP_HOST?.trim();
    if (!host) return false;

    const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
    const secure = process.env.SMTP_SECURE === '1' || port === 465;
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS ?? '';

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
    });

    const from = process.env.MAIL_FROM?.trim() || 'Class Models <noreply@classmodels.be>';

    await transporter.sendMail({
      from,
      to: addr,
      subject,
      html,
      ...(attachments?.length
        ? {
            attachments: attachments.map((a) => ({
              filename: a.filename,
              content: a.content,
              contentType: 'application/pdf',
            })),
          }
        : {}),
    });
    this.log.log(
      attachments?.length
        ? `E-mail met ${attachments.length} bijlage(n) verstuurd naar ${addr}`
        : `E-mail verstuurd naar ${addr}`,
    );
    return true;
  }

  private buildSms(p: AgendaConfirmationPayload): string {
    return `Class Models: ${p.calendarTitle} op ${p.dateLabel} om ${p.timeLabel}. Annuleren: ${p.cancelUrl}`;
  }

  private buildEmailHtml(p: AgendaConfirmationPayload): string {
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return `<!DOCTYPE html>
<html lang="nl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(p.calendarTitle)}</title></head>
<body style="margin:0;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">
<tr><td style="background:#111827;color:#ffffff;padding:20px 24px;font-size:18px;font-weight:600;">Class Models</td></tr>
<tr><td style="padding:24px;color:#18181b;font-size:15px;line-height:1.55;">
<p style="margin:0 0 12px;">Beste ${esc(p.displayName || 'klant')},</p>
<p style="margin:0 0 16px;">Uw afspraak is ingepland. Hieronder vindt u de gegevens en knoppen om te annuleren of — op de dag vóór uw bezoek — uw komst te bevestigen.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid #e4e4e7;border-radius:6px;margin-bottom:20px;">
<tr><td style="padding:14px 16px;">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#71717a;margin-bottom:4px;">Type</div>
<div style="font-weight:600;">${esc(p.calendarTitle)}</div>
<div style="margin-top:12px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#71717a;">Datum &amp; uur</div>
<div style="font-weight:600;">${esc(p.dateLabel)} om ${esc(p.timeLabel)}</div>
</td></tr></table>
<p style="margin:0 0 16px;font-size:14px;color:#52525b;"><strong>Komst bevestigen</strong><br/>
Op de dag <em>vóór</em> uw afspraak kunt u via onderstaande knop laten weten dat u komt. De knop werkt alleen op die dag (Belgische tijd).</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:20px;"><tr><td style="border-radius:6px;background:#0f766e;">
<a href="${esc(p.confirmUrl)}" style="display:inline-block;padding:12px 22px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">Ik bevestig mijn komst</a>
</td></tr></table>
<p style="margin:0 0 12px;font-size:14px;color:#52525b;"><strong>Afspraak annuleren</strong></p>
<table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border-radius:6px;background:#6f121b;">
<a href="${esc(p.cancelUrl)}" style="display:inline-block;padding:12px 22px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">Afspraak annuleren</a>
</td></tr></table>
<p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;">Werkt een knop niet? Kopieer de link in uw browser:<br/>
<span style="word-break:break-all;color:#52525b;">Annuleren: ${esc(p.cancelUrl)}<br/>Bevestigen: ${esc(p.confirmUrl)}</span></p>
</td></tr>
<tr><td style="padding:16px 24px;background:#fafafa;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;">Class Models · Dit is een automatische bevestiging.</td></tr>
</table>
</td></tr></table>
</body></html>`;
  }
}
