import type { PrismaClient } from '@prisma/client';
import {
  AGENDA_DEFAULT_BOOKING_EMAIL_HTML,
  AGENDA_DEFAULT_BOOKING_UPDATED_EMAIL_HTML,
} from './agenda-booking-email-template';
import {
  MODEL_WORDEN_PKG_TARGET_INTAKE,
  MODEL_WORDEN_PKG_TARGET_TESTSHOOT,
  isLegacyGuestAgendaSlug,
  isModelWordenPackageTargetKey,
} from './model-worden-mail';

/** Marker: body al omgezet naar huisstijl (geen blauwe kaders). */
export const CM_EMAIL_BODY_V2 = '<!-- cm-email-body-v2 -->';

const GOLD_BORDER_INFO = `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid #c2a164;margin:0 0 22px;background:#ffffff;">
<tr><td style="padding:16px 18px;text-align:left;">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#856b3f;margin-bottom:4px;">Type</div>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:600;color:#191919;">{{calendar_title}}</div>
<div style="margin-top:14px;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#856b3f;">Datum &amp; uur</div>
<div style="font-weight:600;color:#191919;font-size:16px;">{{appointment_date}} · {{appointment_time}}</div>
</td></tr></table>`;

const BUTTONS_ROW = `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 22px;"><tr>
<td style="padding:0 10px 0 0;vertical-align:middle;">{{confirm_button_html}}</td>
<td style="padding:0;vertical-align:middle;">{{cancel_button_html}}</td>
</tr></table>`;

const CANCEL_ONLY_ROW = `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 22px;"><tr>
<td style="padding:0;vertical-align:middle;">{{cancel_button_html}}</td>
</tr></table>`;

const SIGN_OFF = `<p style="margin:28px 0 0;color:#262420;font-size:16px;line-height:27px;">Met vriendelijke groeten,<br/>Het Class-Models-team</p>`;

function greeting(lead: string): string {
  return `${CM_EMAIL_BODY_V2}
<p style="margin:0 0 18px;text-align:left;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:32px;color:#191919;">Beste {{client_name}},</p>
<p style="margin:0 0 22px;text-align:left;color:#262420;font-size:16px;line-height:27px;">${lead}</p>`;
}

export function brandedBookingCreatedBody(): string {
  return AGENDA_DEFAULT_BOOKING_EMAIL_HTML.includes(CM_EMAIL_BODY_V2)
    ? AGENDA_DEFAULT_BOOKING_EMAIL_HTML
    : `${CM_EMAIL_BODY_V2}\n${AGENDA_DEFAULT_BOOKING_EMAIL_HTML}`;
}

export function brandedBookingUpdatedBody(): string {
  return AGENDA_DEFAULT_BOOKING_UPDATED_EMAIL_HTML.includes(CM_EMAIL_BODY_V2)
    ? AGENDA_DEFAULT_BOOKING_UPDATED_EMAIL_HTML
    : `${CM_EMAIL_BODY_V2}\n${AGENDA_DEFAULT_BOOKING_UPDATED_EMAIL_HTML}`;
}

export function brandedReminderBody(): string {
  return `${greeting('Wij herinneren u graag aan uw afspraak bij Class-Models. Hieronder vindt u de gegevens.')}
${GOLD_BORDER_INFO}
{{maps_route_block_html}}
<p style="margin:0 0 14px;font-size:14px;color:#525049;text-align:left;line-height:22px;">Bevestig uw komst de dag vóór de afspraak, of annuleer indien nodig:</p>
${BUTTONS_ROW}
<p style="margin:0;font-size:12px;color:#857f74;text-align:left;line-height:20px;">Werkt een knop niet?<br/>
<span style="word-break:break-all;color:#525049;">Bevestigen: {{confirm_url}}<br/>Annuleren: {{cancel_url}}</span></p>
${SIGN_OFF}`;
}

export function brandedFollowupBody(opts?: { photos?: boolean }): string {
  if (opts?.photos) {
    return `${greeting('Goed nieuws: de foto’s van uw fotoshoot bij Class-Models zijn beschikbaar.')}
${GOLD_BORDER_INFO}
<p style="margin:0 0 18px;color:#262420;font-size:16px;line-height:27px;">U ontvangt toegang tot uw beelden via de gebruikelijke kanalen (e-mail of gastenportaal). Hebt u vragen? Mail naar info@class-models.be of bel +32 485 32 23 07.</p>
${SIGN_OFF}`;
  }
  return `${greeting('Bedankt voor uw bezoek bij Class-Models. Hierbij een korte opvolging.')}
${GOLD_BORDER_INFO}
<p style="margin:0 0 18px;color:#262420;font-size:16px;line-height:27px;">Hebt u vragen of wilt u een volgende stap zetten? Neem gerust contact op via info@class-models.be of +32 485 32 23 07.</p>
${SIGN_OFF}`;
}

export function brandedCancelledBody(): string {
  return `${greeting('Uw afspraak bij Class-Models is geannuleerd.')}
{{cancel_reason_block_html}}
${GOLD_BORDER_INFO}
<p style="margin:0 0 18px;color:#262420;font-size:16px;line-height:27px;">Wilt u een nieuwe afspraak maken? Dat kan via <a href="https://www.class-models.be/gasten/model-worden" style="color:#856b3f;font-weight:700;">class-models.be</a>.</p>
${SIGN_OFF}`;
}

export function brandedConfirmedBody(): string {
  return `${greeting('Bedankt — uw komst is bevestigd. Wij kijken ernaar uit u te ontvangen.')}
${GOLD_BORDER_INFO}
{{maps_route_block_html}}
${CANCEL_ONLY_ROW}
<p style="margin:0;font-size:12px;color:#857f74;">Annuleren: <span style="word-break:break-all;color:#525049;">{{cancel_url}}</span></p>
${SIGN_OFF}`;
}

function bodyForTrigger(trigger: string, templateName: string): string | null {
  switch (trigger) {
    case 'booking_created':
      return brandedBookingCreatedBody();
    case 'booking_updated':
      return brandedBookingUpdatedBody();
    case 'reminder':
      return brandedReminderBody();
    case 'followup':
      return brandedFollowupBody({ photos: /foto/i.test(templateName) });
    case 'booking_cancelled':
      return brandedCancelledBody();
    case 'booking_confirmed':
      return brandedConfirmedBody();
    default:
      return null;
  }
}

function subjectForTrigger(trigger: string, existing: string | null): string {
  const fallback: Record<string, string> = {
    booking_created: 'Bevestiging: {{calendar_title}} — Class-Models',
    booking_updated: 'Afspraak gewijzigd: {{calendar_title}} — Class-Models',
    reminder: 'Herinnering: {{calendar_title}} — Class-Models',
    followup: 'Opvolging: {{calendar_title}} — Class-Models',
    booking_cancelled: 'Annulatie: {{calendar_title}} — Class-Models',
    booking_confirmed: 'Komst bevestigd: {{calendar_title}} — Class-Models',
  };
  const cur = (existing ?? '').trim();
  if (!cur) return fallback[trigger] ?? 'Class-Models';
  return cur.replace(/Class Models/gi, 'Class-Models');
}

function renameTemplate(name: string): string {
  let n = name.trim();
  n = n.replace(/casting\s*&\s*intake-gesprek/gi, 'Model worden');
  n = n.replace(/intake-gesprek/gi, 'Alleen intake');
  n = n.replace(/gratis\s*fotoshoot/gi, 'Intake + fotoshoot');
  n = n.replace(/aanmaak\s*portfolio/gi, 'Portfolio');
  n = n.replace(/\s{2,}/g, ' ').trim();
  if (/^afspraak bevestiging/i.test(n)) {
    n = n.replace(/^afspraak bevestiging/i, 'Afspraakbevestiging');
  }
  if (/^herinnering/i.test(n)) {
    n = n.replace(/^herinnering/i, 'Herinnering');
  }
  return n;
}

function migrateCalendarSlugs(raw: unknown): string[] | null {
  let list: string[] = [];
  if (Array.isArray(raw)) list = raw.map((x) => String(x));
  else if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as unknown;
      if (Array.isArray(p)) list = p.map((x) => String(x));
    } catch {
      return null;
    }
  } else return null;

  const next = new Set<string>();
  let changed = false;
  for (const s of list) {
    const slug = s.trim();
    if (!slug) continue;
    if (slug === 'intake-gesprek') {
      next.add(MODEL_WORDEN_PKG_TARGET_INTAKE);
      changed = true;
    } else if (slug === 'gratis-fotoshoot') {
      next.add(MODEL_WORDEN_PKG_TARGET_TESTSHOOT);
      changed = true;
    } else if (slug === 'casting' || slug === 'model-worden') {
      next.add(MODEL_WORDEN_PKG_TARGET_INTAKE);
      next.add(MODEL_WORDEN_PKG_TARGET_TESTSHOOT);
      changed = true;
    } else if (isLegacyGuestAgendaSlug(slug)) {
      changed = true;
    } else if (isModelWordenPackageTargetKey(slug) || !isLegacyGuestAgendaSlug(slug)) {
      next.add(slug);
    }
  }
  if (!changed && [...next].sort().join() === [...list].sort().join()) return null;
  return [...next];
}

/**
 * Zet alle e-mail-sjablonen in de DB om naar huisstijl-inhoud (goud/zwart, knoppen naast elkaar).
 * SMS-sjablonen: alleen naam/subject opschonen, body ongemoeid.
 * Idempotent via <!-- cm-email-body-v2 --> (force met AGENDA_RESTYLE_MAIL_TEMPLATES_FORCE=1).
 */
export async function restyleAgendaNotificationEmailTemplates(
  prisma: PrismaClient,
): Promise<{ updated: number }> {
  const rows = await prisma.agendaNotificationTemplate.findMany();
  let updated = 0;

  for (const row of rows) {
    const data: {
      body?: string;
      subject?: string | null;
      name?: string;
      calendarSlugs?: string[];
    } = {};

    const newName = renameTemplate(row.name);
    if (newName !== row.name) data.name = newName;

    const newSubject = subjectForTrigger(row.trigger, row.subject);
    if (newSubject !== (row.subject ?? '')) data.subject = newSubject;

    const slugs = migrateCalendarSlugs(row.calendarSlugs);
    if (slugs) data.calendarSlugs = slugs;

    if (row.channel === 'email') {
      const force =
        String(process.env.AGENDA_RESTYLE_MAIL_TEMPLATES_FORCE || '').trim() === '1';
      const already = (row.body ?? '').includes(CM_EMAIL_BODY_V2);
      const hasBlue =
        /#dbeafe|#e0f2fe|#bfdbfe|#3b82f6|#2563eb|lightblue|rgb\(\s*219/i.test(row.body ?? '');
      const nextBody = bodyForTrigger(row.trigger, row.name);
      if (nextBody && (force || !already || hasBlue)) {
        data.body = nextBody;
      }
    }

    if (!Object.keys(data).length) continue;

    await prisma.agendaNotificationTemplate.update({
      where: { id: row.id },
      data: {
        ...(data.body !== undefined ? { body: data.body } : {}),
        ...(data.subject !== undefined ? { subject: data.subject } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.calendarSlugs !== undefined
          ? { calendarSlugs: data.calendarSlugs as unknown as object }
          : {}),
      },
    });
    updated += 1;
  }

  return { updated };
}
