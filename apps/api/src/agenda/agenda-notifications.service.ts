import { AGENDA_DEFAULT_BOOKING_EMAIL_HTML } from '@cm/shared';
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

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

function parseSlugList(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  return [];
}

function applyTemplatePlaceholders(template: string, vars: Record<string, string>): string {
  let out = template;
  const entries = Object.entries(vars).sort((a, b) => b[0].length - a[0].length);
  for (const [k, v] of entries) {
    const safe = v ?? '';
    out = out.split(`{{${k}}}`).join(safe);
  }
  for (const [k, v] of entries) {
    const safe = v ?? '';
    out = out.split(`{${k}}`).join(safe);
  }
  return out;
}

/** Knoppen + links voor placeholders in agenda-sjablonen. */
function buildBookingPlaceholderVars(
  ctx: AgendaConfirmationPayload,
  mode: 'html' | 'plain',
): Record<string, string> {
  if (mode === 'plain') {
    return {
      client_name: ctx.displayName || 'klant',
      calendar_title: ctx.calendarTitle,
      appointment_date: ctx.dateLabel,
      appointment_time: ctx.timeLabel,
      cancel_url: ctx.cancelUrl,
      confirm_url: ctx.confirmUrl,
      cancel_link_html: ctx.cancelUrl,
      confirm_link_html: ctx.confirmUrl,
      cancel_button_html: '',
      confirm_button_html: '',
    };
  }
  const esc = (s: string) => escHtml(s);
  const cancelU = esc(ctx.cancelUrl);
  const confirmU = esc(ctx.confirmUrl);
  return {
    client_name: esc(ctx.displayName || 'klant'),
    calendar_title: esc(ctx.calendarTitle),
    appointment_date: esc(ctx.dateLabel),
    appointment_time: esc(ctx.timeLabel),
    cancel_url: cancelU,
    confirm_url: confirmU,
    cancel_link_html: `<a href="${cancelU}">Afspraak annuleren</a>`,
    confirm_link_html: `<a href="${confirmU}">Ik bevestig mijn komst</a>`,
    cancel_button_html: `<table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border-radius:6px;background:#6f121b;"><a href="${cancelU}" style="display:inline-block;padding:12px 22px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">Afspraak annuleren</a></td></tr></table>`,
    confirm_button_html: `<table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:20px;"><tr><td style="border-radius:6px;background:#0f766e;"><a href="${confirmU}" style="display:inline-block;padding:12px 22px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">Ik bevestig mijn komst</a></td></tr></table>`,
  };
}

/**
 * Zorgt dat platte tekst of een HTML-fragment netjes in een document staat (betere weergave in clients).
 */
function coerceOutgoingEmailHtml(inner: string): string {
  const t = inner.trim();
  if (!t) {
    return '<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"/></head><body></body></html>';
  }
  if (/^<!DOCTYPE/i.test(t) || /^<html/i.test(t)) return t;
  if (!t.includes('<')) {
    const body = escHtml(t).replace(/\r\n/g, '\n').replace(/\n/g, '<br/>\n');
    return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;"><tr><td align="center"><div style="max-width:560px;text-align:left;background:#ffffff;border-radius:8px;padding:24px;border:1px solid #e4e4e7;color:#18181b;font-size:15px;line-height:1.55;">${body}</div></td></tr></table></body></html>`;
  }
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;"><tr><td align="center">${t}</td></tr></table></body></html>`;
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

    const vars = buildBookingPlaceholderVars(ctx, 'html');

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
        applyTemplatePlaceholders(t.subject?.trim() || `Melding: ${ctx.calendarTitle}`, vars) ||
        `Melding: ${ctx.calendarTitle}`;
      const html = coerceOutgoingEmailHtml(applyTemplatePlaceholders(t.body, vars));
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
      const text = applyTemplatePlaceholders(t.body, buildBookingPlaceholderVars(ctx, 'plain'));
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
    return applyTemplatePlaceholders(AGENDA_DEFAULT_BOOKING_EMAIL_HTML, buildBookingPlaceholderVars(p, 'html'));
  }
}
