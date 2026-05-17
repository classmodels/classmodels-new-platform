import { AGENDA_DEFAULT_BOOKING_EMAIL_HTML } from './agenda-booking-email-template';
import {
  applyAgendaMailPlaceholders,
  buildAgendaMailPlaceholderVars,
  coerceOutgoingEmailHtml,
} from './agenda-mail-placeholders';
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { resolveSmtpConfig } from '../mail/mail-smtp-resolve';
import { PrismaService } from '../prisma/prisma.service';

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

export type AgendaLifecycleTrigger =
  | 'booking_created'
  | 'booking_cancelled'
  | 'booking_confirmed'
  | 'reminder'
  | 'followup';

export type DispatchBookingCtx = AgendaConfirmationPayload & {
  calendarSlug: string;
};

function parseSlugList(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  return [];
}

/** Belgische GSM → E.164 +32… voor BulkSMS. */
export function normalizeBelgiumMsisdn(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let d = raw.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = `+${d.slice(2)}`;
  if (d.startsWith('0') && d.length >= 9) d = `+32${d.slice(1)}`;
  if (d.startsWith('32') && !d.startsWith('+')) d = `+${d}`;
  if (!d.startsWith('+')) return null;
  if (!/^\+[1-9]\d{7,14}$/.test(d)) return null;
  return d;
}

@Injectable()
export class AgendaNotificationService {
  private readonly log = new Logger(AgendaNotificationService.name);

  constructor(private prisma: PrismaService) {}

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

  /** Zelfde SMTP (`SMTP_HOST`, …). Retourneert false als niet geconfigureerd of geen adres. */
  async sendHtmlMail(to: string, subject: string, html: string): Promise<boolean> {
    return this.trySendSmtp(to, subject, html);
  }

  async sendHtmlMailWithAttachments(
    to: string,
    subject: string,
    html: string,
    attachments: { filename: string; content: Buffer }[],
  ): Promise<boolean> {
    return this.trySendSmtp(to, subject, html, attachments);
  }

  /**
   * Sjablonen uit DB (offset 0 = meteen). Geen matchende e-mailtemplate → standaardbevestiging.
   * SMS: sjablonen + anders korte standaard via BulkSMS indien geconfigureerd.
   */
  async dispatchBookingLifecycle(trigger: AgendaLifecycleTrigger, ctx: DispatchBookingCtx): Promise<void> {
    const rows = await this.prisma.agendaNotificationTemplate.findMany({
      where: { enabled: true, trigger },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const vars = buildAgendaMailPlaceholderVars(ctx, 'html');

    const matches = rows.filter((t) => {
      const slugs = parseSlugList(t.calendarSlugs);
      return !slugs.length || slugs.includes(ctx.calendarSlug);
    });

    const dueNow = matches.filter((t) => t.offsetMinutes === 0);
    const deferred = matches.filter((t) => t.offsetMinutes !== 0);
    if (deferred.length) {
      this.log.debug(`${deferred.length} sjabloon(nen) met offset≠0: geplande herinnering volgt later (cron).`);
    }

    let emailSent = false;
    for (const t of dueNow.filter((x) => x.channel === 'email')) {
      const to = ctx.toEmail?.trim();
      if (!to) continue;
      const subject =
        applyAgendaMailPlaceholders(t.subject?.trim() || `Melding: ${ctx.calendarTitle}`, vars) ||
        `Melding: ${ctx.calendarTitle}`;
      const html = coerceOutgoingEmailHtml(applyAgendaMailPlaceholders(t.body, vars));
      const ok = await this.trySendSmtp(to, subject, html);
      if (ok) emailSent = true;
    }
    if (!emailSent && ctx.toEmail?.trim() && trigger === 'booking_created') {
      await this.sendBookingConfirmation(ctx);
    }

    const settings = await this.prisma.agendaMessagingSettings.findUnique({ where: { id: 1 } });
    const buUser = settings?.bulksmsUsername?.trim() || process.env.BULKSMS_USERNAME?.trim();
    const buPass = settings?.bulksmsPassword ?? process.env.BULKSMS_PASSWORD ?? '';

    let smsSent = false;
    for (const t of dueNow.filter((x) => x.channel === 'sms')) {
      const msisdn = normalizeBelgiumMsisdn(ctx.phone);
      if (!msisdn) continue;
      const text = applyAgendaMailPlaceholders(t.body, buildAgendaMailPlaceholderVars(ctx, 'plain'));
      const ok = await this.trySendBulksms(buUser, buPass, msisdn, text);
      if (ok) smsSent = true;
    }
    if (!smsSent) {
      const msisdn = normalizeBelgiumMsisdn(ctx.phone);
      if (msisdn && buUser && buPass && trigger === 'booking_created') {
        const fallback = this.buildSms(ctx);
        await this.trySendBulksms(buUser, buPass, msisdn, fallback);
      } else {
        this.log.log(`SMS → ${ctx.phone ?? '(geen GSM)'}\n${this.buildSms(ctx)}`);
      }
    }
  }

  /** @deprecated Gebruik dispatchBookingLifecycle; behouden voor interne fallback. */
  async sendBookingConfirmation(p: AgendaConfirmationPayload): Promise<void> {
    const subject = `Bevestiging: ${p.calendarTitle} — Class Models`;
    const html = this.buildEmailHtml(p);
    const mailed = await this.trySendSmtp(p.toEmail, subject, html);
    if (!mailed) {
      this.log.log(`E-mail (niet verstuurd — zet SMTP_HOST): ${subject} → ${p.toEmail ?? '(geen e-mail)'}`);
      this.log.debug(html);
    }
  }

  private async trySendBulksms(
    username: string | undefined,
    password: string,
    to: string,
    body: string,
  ): Promise<boolean> {
    if (!username?.trim() || !password) return false;
    const auth = Buffer.from(`${username.trim()}:${password}`, 'utf8').toString('base64');
    try {
      const res = await fetch('https://api.bulksms.com/v1/messages', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          body: body.slice(0, 640),
          encoding: 'UNICODE',
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        this.log.warn(`BulkSMS HTTP ${res.status}: ${t}`);
        return false;
      }
      this.log.log(`BulkSMS verstuurd naar ${to}`);
      return true;
    } catch (e) {
      this.log.warn(`BulkSMS mislukt: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }

  private async trySendSmtp(
    to: string | null,
    subject: string,
    html: string,
    attachments?: { filename: string; content: Buffer }[],
  ): Promise<boolean> {
    const addr = to?.trim();
    if (!addr) return false;

    const cfg = await resolveSmtpConfig(this.prisma);
    if (!cfg) return false;

    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    });

    await transporter.sendMail({
      from: cfg.from,
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
    return applyAgendaMailPlaceholders(
      AGENDA_DEFAULT_BOOKING_EMAIL_HTML,
      buildAgendaMailPlaceholderVars(
        {
          displayName: p.displayName,
          calendarTitle: p.calendarTitle,
          dateLabel: p.dateLabel,
          timeLabel: p.timeLabel,
          cancelUrl: p.cancelUrl,
          confirmUrl: p.confirmUrl,
        },
        'html',
      ),
    );
  }
}
