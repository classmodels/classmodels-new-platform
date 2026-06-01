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
import { CLASS_MODELS_OFFICE, formatGuestAddressFromFields, googleMapsDirectionsUrl } from './class-models-office';
import { AgendaTravelService } from './agenda-travel.service';
import { isAgendaBookingEnrolled, isGuestIntakeCalendarSlug } from './guest-intake-calendars';

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
  /** Huidige reserveringsstatus (o.a. voor opvolg-/herinneringssjablonen). */
  bookingStatus?: string;
  bookingId?: string;
  officeAddress?: string;
  distanceLabel?: string;
  mapsDirectionsUrl?: string;
  staticMapImageUrl?: string;
};

/** Opvolging/herinnering: filter op ingeschreven ja/nee (status `confirmed` = ingeschreven). */
export function templateMatchesEnrollmentFilter(
  filter: string | null | undefined,
  bookingStatus: string | undefined,
): boolean {
  const f = filter?.trim();
  if (!f || f === 'all') return true;
  const status = bookingStatus ?? '';
  const enrolled = isAgendaBookingEnrolled(status);
  if (f === 'enrolled') return enrolled;
  if (f === 'not_enrolled') return !enrolled;
  return true;
}

export function parseSlugList(raw: unknown): string[] {
  if (raw == null) return [];
  let v: unknown = raw;
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return [];
    try {
      v = JSON.parse(t) as unknown;
    } catch {
      return [];
    }
  }
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return [];
}

/** Alleen aangevinkte agenda-slugs in het sjabloon; lege lijst = nergens. */
export function templateAppliesToCalendar(templateSlugsRaw: unknown, calendarSlug: string): boolean {
  const slugs = parseSlugList(templateSlugsRaw);
  if (!slugs.length) return false;
  return slugs.includes(calendarSlug);
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
  private smtpCache: {
    key: string;
    transporter: nodemailer.Transporter;
    from: string;
  } | null = null;

  constructor(
    private prisma: PrismaService,
    private travel: AgendaTravelService,
  ) {}

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
    const r = await this.sendHtmlMailDetailed(to, subject, html);
    return r.ok;
  }

  /** Met fouttekst (bulk-mail, logging). */
  async sendHtmlMailDetailed(
    to: string,
    subject: string,
    html: string,
  ): Promise<{ ok: boolean; error?: string }> {
    return this.trySendSmtpDetailed(to, subject, html);
  }

  /** Sluit SMTP-pool (na rate limit of na batch bulk-mail). */
  resetSmtpPool(): void {
    const t = this.smtpCache?.transporter;
    this.smtpCache = null;
    if (t) {
      try {
        t.close();
      } catch {
        /* negeer */
      }
    }
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
   * Alleen actieve sjablonen uit de database (offset 0 = meteen). Geen fallback-mail of -SMS:
   * er wordt niets verstuurd tenzij u een passend sjabloon aan heeft staan en SMTP/BulkSMS werkt.
   */
  async dispatchBookingLifecycle(trigger: AgendaLifecycleTrigger, ctx: DispatchBookingCtx): Promise<void> {
    try {
      const rows = await this.prisma.agendaNotificationTemplate.findMany({
        where: { enabled: true, trigger },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });

      const vars = buildAgendaMailPlaceholderVars(
        {
          displayName: ctx.displayName,
          calendarTitle: ctx.calendarTitle,
          dateLabel: ctx.dateLabel,
          timeLabel: ctx.timeLabel,
          cancelUrl: ctx.cancelUrl,
          confirmUrl: ctx.confirmUrl,
          officeAddress: ctx.officeAddress,
          distanceLabel: ctx.distanceLabel,
          mapsDirectionsUrl: ctx.mapsDirectionsUrl,
          staticMapImageUrl: ctx.staticMapImageUrl,
        },
        'html',
      );

      const matches = rows.filter(
        (t) =>
          templateAppliesToCalendar(t.calendarSlugs, ctx.calendarSlug) &&
          templateMatchesEnrollmentFilter(t.enrollmentFilter, ctx.bookingStatus),
      );

      const dueNow = matches.filter((t) => t.offsetMinutes === 0);
      const deferred = matches.filter((t) => t.offsetMinutes !== 0);
      if (deferred.length) {
        this.log.debug(`${deferred.length} sjabloon(nen) met offset≠0: geplande herinnering volgt later (cron).`);
      }

      let emailSent = false;
      const emailTemplates = dueNow.filter((x) => x.channel === 'email');
      for (const t of emailTemplates) {
        const to = ctx.toEmail?.trim();
        if (!to) continue;
        const subject =
          applyAgendaMailPlaceholders(t.subject?.trim() || `Melding: ${ctx.calendarTitle}`, vars) ||
          `Melding: ${ctx.calendarTitle}`;
        const html = coerceOutgoingEmailHtml(applyAgendaMailPlaceholders(t.body, vars));
        const result = await this.sendHtmlMailDetailed(to, subject, html);
        if (result.ok) emailSent = true;
        await this.recordBookingNotificationLog({
          bookingId: ctx.bookingId,
          channel: 'email',
          trigger,
          templateId: t.id,
          templateName: t.name,
          subject,
          recipient: to,
          bodyPreview: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
          sent: result.ok,
          errorMessage: result.ok ? undefined : result.error,
        });
      }
      if (!emailSent && trigger === 'booking_created' && ctx.toEmail?.trim()) {
        if (!emailTemplates.length) {
          this.log.debug(
            `Agenda "${ctx.calendarSlug}": geen actief e-mailsjabloon (offset 0) — geen mail verstuurd.`,
          );
        } else {
          this.log.debug(
            `Agenda "${ctx.calendarSlug}": e-mailsjabloon(nen) niet verzonden (SMTP of inhoud).`,
          );
        }
      }

      const settings = await this.prisma.agendaMessagingSettings.findUnique({ where: { id: 1 } });
      const buUser = settings?.bulksmsUsername?.trim() || process.env.BULKSMS_USERNAME?.trim();
      const buPass = settings?.bulksmsPassword ?? process.env.BULKSMS_PASSWORD ?? '';

      let smsSent = false;
      const smsTemplates = dueNow.filter((x) => x.channel === 'sms');
      for (const t of smsTemplates) {
        const msisdn = normalizeBelgiumMsisdn(ctx.phone);
        if (!msisdn) continue;
        const text = applyAgendaMailPlaceholders(
          t.body,
          buildAgendaMailPlaceholderVars(
            {
              displayName: ctx.displayName,
              calendarTitle: ctx.calendarTitle,
              dateLabel: ctx.dateLabel,
              timeLabel: ctx.timeLabel,
              cancelUrl: ctx.cancelUrl,
              confirmUrl: ctx.confirmUrl,
              officeAddress: ctx.officeAddress,
              distanceLabel: ctx.distanceLabel,
              mapsDirectionsUrl: ctx.mapsDirectionsUrl,
              staticMapImageUrl: ctx.staticMapImageUrl,
            },
            'plain',
          ),
        );
        const ok = await this.trySendBulksms(buUser, buPass, msisdn, text);
        if (ok) smsSent = true;
        await this.recordBookingNotificationLog({
          bookingId: ctx.bookingId,
          channel: 'sms',
          trigger,
          templateId: t.id,
          templateName: t.name,
          recipient: msisdn,
          bodyPreview: text,
          sent: ok,
          errorMessage: ok ? undefined : 'SMS niet verstuurd (BulkSMS of credentials).',
        });
      }
      if (!smsSent && trigger === 'booking_created') {
        const msisdn = normalizeBelgiumMsisdn(ctx.phone);
        if (msisdn) {
          if (!smsTemplates.length) {
            const activeSms = rows.filter((t) => t.offsetMinutes === 0 && t.channel === 'sms');
            this.log.warn(
              activeSms.length
                ? `Agenda "${ctx.calendarSlug}": geen SMS-sjabloon van toepassing (${activeSms.length} actief maar deze agenda niet aangevinkt). Vink de agenda aan bij het sjabloon.`
                : `Agenda "${ctx.calendarSlug}": geen actief SMS-sjabloon bij nieuwe boeking (offset 0).`,
            );
          } else {
            this.log.warn(
              `Agenda "${ctx.calendarSlug}": SMS niet verstuurd naar ${msisdn} (BulkSMS-account of API-fout).`,
            );
          }
        } else if (ctx.phone?.trim()) {
          this.log.warn(
            `Agenda "${ctx.calendarSlug}": GSM ongeldig voor SMS (${ctx.phone.trim()}).`,
          );
        }
      }
    } catch (e) {
      this.log.error(
        `Agenda "${trigger}" (${ctx.calendarSlug}): melding/SMS-pad gefaald — boeking of actie blijft geldig: ${e instanceof Error ? e.message : String(e)}`,
        e instanceof Error ? e.stack : undefined,
      );
    }
  }

  /** Handmatige of legacy bevestigingsmail (niet meer automatisch bij boeking zonder sjabloon). */
  async sendBookingConfirmation(p: AgendaConfirmationPayload): Promise<void> {
    try {
      const subject = `Bevestiging: ${p.calendarTitle} — Class Models`;
      const html = this.buildEmailHtml(p);
      const mailed = await this.trySendSmtp(p.toEmail, subject, html);
      if (!mailed) {
        this.log.log(`E-mail (niet verstuurd — zet SMTP_HOST): ${subject} → ${p.toEmail ?? '(geen e-mail)'}`);
        this.log.debug(html);
      }
    } catch (e) {
      this.log.error(
        `Standaard bevestigingsmail kon niet worden opgebouwd of verstuurd: ${e instanceof Error ? e.message : String(e)}`,
        e instanceof Error ? e.stack : undefined,
      );
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

  private async getSmtpTransport(): Promise<{
    transporter: nodemailer.Transporter;
    from: string;
  } | null> {
    let cfg: Awaited<ReturnType<typeof resolveSmtpConfig>>;
    try {
      cfg = await resolveSmtpConfig(this.prisma);
    } catch (e) {
      this.log.warn(`SMTP-config lezen mislukt: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
    if (!cfg) return null;
    const key = `${cfg.host}:${cfg.port}:${cfg.user}:${cfg.from}`;
    if (this.smtpCache?.key === key) {
      return { transporter: this.smtpCache.transporter, from: this.smtpCache.from };
    }
    try {
      const rateDelta = parseInt(process.env.SMTP_RATE_DELTA_MS || '1000', 10);
      const rateLimit = parseInt(process.env.SMTP_RATE_LIMIT || '3', 10);
      const transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
        pool: true,
        maxConnections: 2,
        /** Nodemailer-default is 100 — daarna faalt vaak alles; lager + pool-reset in bulk. */
        maxMessages: parseInt(process.env.SMTP_POOL_MAX_MESSAGES || '25', 10) || 25,
        rateDelta: Number.isFinite(rateDelta) && rateDelta > 0 ? rateDelta : 1000,
        rateLimit: Number.isFinite(rateLimit) && rateLimit > 0 ? rateLimit : 3,
      });
      this.smtpCache = { key, transporter, from: cfg.from };
      return { transporter, from: cfg.from };
    } catch (e) {
      this.log.warn(`SMTP-transport ongeldig: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  private smtpErrorMessage(e: unknown): string {
    if (e instanceof Error) return e.message.slice(0, 500);
    return String(e).slice(0, 500);
  }

  private async recordBookingNotificationLog(input: {
    bookingId?: string;
    channel: 'email' | 'sms';
    trigger: AgendaLifecycleTrigger;
    templateId: string;
    templateName: string;
    subject?: string;
    recipient?: string;
    bodyPreview?: string;
    sent: boolean;
    errorMessage?: string;
  }): Promise<void> {
    if (!input.bookingId) return;
    try {
      await this.prisma.agendaBookingNotificationLog.create({
        data: {
          bookingId: input.bookingId,
          channel: input.channel,
          trigger: input.trigger,
          templateId: input.templateId,
          templateName: input.templateName,
          subject: input.subject ?? null,
          recipient: input.recipient ?? null,
          bodyPreview: input.bodyPreview?.slice(0, 4000) ?? null,
          sent: input.sent,
          sentAt: input.sent ? new Date() : null,
          errorMessage: input.errorMessage ?? null,
        },
      });
    } catch (e) {
      this.log.warn(
        `Notification log opslaan mislukt (${input.bookingId}): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private isSmtpRateOrQuotaError(msg: string): boolean {
    const m = msg.toLowerCase();
    return (
      m.includes('rate') ||
      m.includes('limit') ||
      m.includes('quota') ||
      m.includes('too many') ||
      m.includes('throttl') ||
      m.includes('421') ||
      m.includes('450') ||
      m.includes('452') ||
      m.includes('454') ||
      m.includes('exceeded')
    );
  }

  private async trySendSmtp(
    to: string | null,
    subject: string,
    html: string,
    attachments?: { filename: string; content: Buffer }[],
  ): Promise<boolean> {
    const r = await this.trySendSmtpDetailed(to, subject, html, attachments);
    return r.ok;
  }

  private async trySendSmtpDetailed(
    to: string | null,
    subject: string,
    html: string,
    attachments?: { filename: string; content: Buffer }[],
  ): Promise<{ ok: boolean; error?: string }> {
    const addr = to?.trim();
    if (!addr) return { ok: false, error: 'Geen e-mailadres' };

    const maxAttempts = parseInt(process.env.SMTP_SEND_MAX_ATTEMPTS || '5', 10) || 5;
    let lastErr = 'SMTP niet geconfigureerd';

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        const waitMs = this.isSmtpRateOrQuotaError(lastErr)
          ? Math.min(
              120_000,
              parseInt(process.env.SMTP_RATE_LIMIT_RETRY_MS || '8000', 10) * Math.pow(2, attempt - 1),
            )
          : 1500 * attempt;
        await new Promise((r) => setTimeout(r, waitMs));
        this.resetSmtpPool();
      }

      const smtp = await this.getSmtpTransport();
      if (!smtp) return { ok: false, error: lastErr };

      try {
        await smtp.transporter.sendMail({
          from: smtp.from,
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
        if (attempt > 0) {
          this.log.log(`SMTP retry ${attempt + 1} geslaagd → ${addr}`);
        } else {
          this.log.log(
            attachments?.length
              ? `E-mail met ${attachments.length} bijlage(n) verstuurd naar ${addr}`
              : `E-mail verstuurd naar ${addr}`,
          );
        }
        return { ok: true };
      } catch (e) {
        lastErr = this.smtpErrorMessage(e);
        this.log.warn(`SMTP poging ${attempt + 1}/${maxAttempts} → ${addr}: ${lastErr}`);
        if (!this.isSmtpRateOrQuotaError(lastErr) && attempt >= 1) break;
      }
    }

    return { ok: false, error: lastErr };
  }

  /**
   * Verstuurt herinneringen/opvolging met offset ≠ 0 (bv. −12 uur vóór start).
   * Wordt elke 5 minuten aangeroepen door AgendaReminderScheduler.
   */
  async processScheduledNotifications(): Promise<number> {
    const windowMin = Math.max(
      5,
      parseInt(process.env.AGENDA_REMINDER_WINDOW_MIN || '12', 10) || 12,
    );
    const templates = await this.prisma.agendaNotificationTemplate.findMany({
      where: {
        enabled: true,
        trigger: { in: ['reminder', 'followup'] },
        offsetMinutes: { not: 0 },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    if (!templates.length) return 0;

    const now = Date.now();
    const bookings = await this.prisma.agendaBooking.findMany({
      where: {
        status: { in: ['pending', 'confirmed', 'acknowledged'] },
        startAt: {
          gte: new Date(now - 7 * 24 * 60 * 60 * 1000),
          lte: new Date(now + 14 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        slot: { include: { calendar: true } },
      },
    });

    let sentCount = 0;
    for (const template of templates) {
      const offset = template.offsetMinutes;
      if (offset === 0) continue;
      const target = Math.abs(offset);
      const isBefore = offset < 0;

      for (const b of bookings) {
        const cal = b.slot.calendar;
        if (!templateAppliesToCalendar(template.calendarSlugs, cal.slug)) continue;
        if (!templateMatchesEnrollmentFilter(template.enrollmentFilter, b.status)) continue;

        const already = await this.prisma.agendaBookingNotificationLog.findFirst({
          where: { bookingId: b.id, templateId: template.id, sent: true },
        });
        if (already) continue;

        const diffMin = (b.startAt.getTime() - now) / 60_000;
        let due = false;
        if (template.trigger === 'reminder' && isBefore) {
          due = diffMin > 0 && diffMin >= target - windowMin && diffMin <= target + windowMin;
        } else if (template.trigger === 'followup' && !isBefore) {
          const sinceStart = -diffMin;
          due = sinceStart >= target - windowMin && sinceStart <= target + windowMin;
        }
        if (!due) continue;

        const ctx = await this.buildDispatchCtxFromBooking(b, cal.slug);
        const ok = await this.sendSingleTemplate(template, template.trigger as AgendaLifecycleTrigger, ctx);
        if (ok) sentCount++;
      }
    }
    return sentCount;
  }

  private async buildDispatchCtxFromBooking(
    b: {
      id: string;
      status: string;
      name: string | null;
      firstname: string | null;
      lastname: string | null;
      email: string | null;
      phone: string | null;
      fieldsJson: unknown;
      cancelToken: string | null;
      startAt: Date;
      endAt: Date;
      slot: {
        startTime: string;
        endTime: string;
        slotDate: Date;
        calendar: { slug: string; title: string; showEndTimeOnPublic: boolean };
      };
    },
    calendarSlug: string,
  ): Promise<DispatchBookingCtx> {
    const cal = b.slot.calendar;
    const hideCancel = process.env.AGENDA_HIDE_CANCEL_LINK === '1';
    const token = b.cancelToken ?? '';
    const webBase = (
      process.env.WEB_PUBLIC_URL ||
      process.env.WEB_APP_URL ||
      process.env.APP_PUBLIC_URL ||
      'https://www.class-models.be'
    ).replace(/\/$/, '');
    const cancelUrl = hideCancel || !token ? '' : `${webBase}/portal/guest/annuleer?token=${encodeURIComponent(token)}`;
    const confirmUrl = token ? `${webBase}/portal/guest/bevestig?token=${encodeURIComponent(token)}` : '';

    let dateLabel: string;
    try {
      dateLabel = new Intl.DateTimeFormat('nl-BE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(b.slot.slotDate);
    } catch {
      dateLabel = b.slot.slotDate.toISOString().slice(0, 10);
    }
    const st = String(b.slot.startTime ?? '').slice(0, 5);
    const et = String(b.slot.endTime ?? '').slice(0, 5);
    const timeLabel =
      cal.showEndTimeOnPublic !== false ? `${st} – ${et}` : st;

    const displayName =
      (b.name ?? '').trim() ||
      [b.firstname, b.lastname].filter(Boolean).join(' ').trim() ||
      'klant';

    const fj =
      b.fieldsJson && typeof b.fieldsJson === 'object' && !Array.isArray(b.fieldsJson)
        ? (b.fieldsJson as Record<string, string>)
        : {};
    const visitorAddress = formatGuestAddressFromFields(fj);
    let distanceLabel = '';
    let mapsDirectionsUrl = visitorAddress ? googleMapsDirectionsUrl(visitorAddress) : '';
    let staticMapImageUrl = '';
    if (isGuestIntakeCalendarSlug(calendarSlug) && visitorAddress) {
      try {
        const t = await this.travel.travelInfoForGuestFields(fj);
        if (t) {
          distanceLabel = t.distanceLabel;
          mapsDirectionsUrl = t.mapsDirectionsUrl;
          staticMapImageUrl = t.staticMapImageUrl;
        }
      } catch {
        /* route optioneel */
      }
    }

    return {
      bookingId: b.id,
      bookingStatus: b.status,
      calendarSlug: cal.slug,
      calendarTitle: cal.title,
      displayName,
      toEmail: b.email,
      phone: b.phone,
      dateLabel,
      timeLabel,
      cancelUrl,
      confirmUrl,
      officeAddress: CLASS_MODELS_OFFICE.fullAddress,
      distanceLabel,
      mapsDirectionsUrl,
      staticMapImageUrl,
    };
  }

  private async sendSingleTemplate(
    template: {
      id: string;
      name: string;
      channel: string;
      subject: string | null;
      body: string;
    },
    trigger: AgendaLifecycleTrigger,
    ctx: DispatchBookingCtx,
  ): Promise<boolean> {
    const varsHtml = buildAgendaMailPlaceholderVars(
      {
        displayName: ctx.displayName,
        calendarTitle: ctx.calendarTitle,
        dateLabel: ctx.dateLabel,
        timeLabel: ctx.timeLabel,
        cancelUrl: ctx.cancelUrl,
        confirmUrl: ctx.confirmUrl,
        officeAddress: ctx.officeAddress,
        distanceLabel: ctx.distanceLabel,
        mapsDirectionsUrl: ctx.mapsDirectionsUrl,
        staticMapImageUrl: ctx.staticMapImageUrl,
      },
      'html',
    );
    const varsPlain = buildAgendaMailPlaceholderVars(
      {
        displayName: ctx.displayName,
        calendarTitle: ctx.calendarTitle,
        dateLabel: ctx.dateLabel,
        timeLabel: ctx.timeLabel,
        cancelUrl: ctx.cancelUrl,
        confirmUrl: ctx.confirmUrl,
        officeAddress: ctx.officeAddress,
        distanceLabel: ctx.distanceLabel,
        mapsDirectionsUrl: ctx.mapsDirectionsUrl,
        staticMapImageUrl: ctx.staticMapImageUrl,
      },
      'plain',
    );

    if (template.channel === 'email') {
      const to = ctx.toEmail?.trim();
      if (!to) return false;
      const subject =
        applyAgendaMailPlaceholders(template.subject?.trim() || `Herinnering: ${ctx.calendarTitle}`, varsPlain) ||
        `Herinnering: ${ctx.calendarTitle}`;
      const html = coerceOutgoingEmailHtml(applyAgendaMailPlaceholders(template.body, varsHtml));
      const result = await this.sendHtmlMailDetailed(to, subject, html);
      await this.recordBookingNotificationLog({
        bookingId: ctx.bookingId,
        channel: 'email',
        trigger,
        templateId: template.id,
        templateName: template.name,
        subject,
        recipient: to,
        bodyPreview: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        sent: result.ok,
        errorMessage: result.ok ? undefined : result.error,
      });
      return result.ok;
    }

    if (template.channel === 'sms') {
      const msisdn = normalizeBelgiumMsisdn(ctx.phone);
      if (!msisdn) return false;
      const settings = await this.prisma.agendaMessagingSettings.findUnique({ where: { id: 1 } });
      const buUser = settings?.bulksmsUsername?.trim() || process.env.BULKSMS_USERNAME?.trim();
      const buPass = settings?.bulksmsPassword ?? process.env.BULKSMS_PASSWORD ?? '';
      const text = applyAgendaMailPlaceholders(template.body, varsPlain);
      const ok = await this.trySendBulksms(buUser, buPass, msisdn, text);
      await this.recordBookingNotificationLog({
        bookingId: ctx.bookingId,
        channel: 'sms',
        trigger,
        templateId: template.id,
        templateName: template.name,
        recipient: msisdn,
        bodyPreview: text,
        sent: ok,
        errorMessage: ok ? undefined : 'SMS niet verstuurd (BulkSMS of credentials).',
      });
      return ok;
    }

    return false;
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

  /** BulkSMS via geconfigureerde account (DB of env), o.a. bulk-backoffice. */
  async sendConfiguredSms(toPhone: string | null | undefined, body: string): Promise<boolean> {
    const msisdn = normalizeBelgiumMsisdn(toPhone);
    if (!msisdn || !body.trim()) return false;
    const settings = await this.prisma.agendaMessagingSettings.findUnique({ where: { id: 1 } });
    const buUser = settings?.bulksmsUsername?.trim() || process.env.BULKSMS_USERNAME?.trim();
    const buPass = settings?.bulksmsPassword ?? process.env.BULKSMS_PASSWORD ?? '';
    return this.trySendBulksms(buUser, buPass, msisdn, body.trim());
  }
}
