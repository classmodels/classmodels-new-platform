"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENDA_DEFAULT_BOOKING_EMAIL_HTML = void 0;
/**
 * Standaard HTML voor agenda-bevestigingsmail (placeholders met {{naam}} of {naam}).
 * Vervanging en HTML-escaping gebeurt server-side in de API.
 */
exports.AGENDA_DEFAULT_BOOKING_EMAIL_HTML = `<!DOCTYPE html>
<html lang="nl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{{calendar_title}}</title></head>
<body style="margin:0;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">
<tr><td style="background:#111827;color:#ffffff;padding:20px 24px;font-size:18px;font-weight:600;">Class Models</td></tr>
<tr><td style="padding:24px;color:#18181b;font-size:15px;line-height:1.55;">
<p style="margin:0 0 12px;">Beste {{client_name}},</p>
<p style="margin:0 0 16px;">Uw afspraak is ingepland. Hieronder vindt u de gegevens en knoppen om te annuleren of — op de dag vóór uw bezoek — uw komst te bevestigen.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid #e4e4e7;border-radius:6px;margin-bottom:20px;">
<tr><td style="padding:14px 16px;">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#71717a;margin-bottom:4px;">Type</div>
<div style="font-weight:600;">{{calendar_title}}</div>
<div style="margin-top:12px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#71717a;">Datum &amp; uur</div>
<div style="font-weight:600;">{{appointment_date}} om {{appointment_time}}</div>
</td></tr></table>
<p style="margin:0 0 16px;font-size:14px;color:#52525b;"><strong>Komst bevestigen</strong><br/>
Op de dag <em>vóór</em> uw afspraak kunt u via onderstaande knop laten weten dat u komt. De knop werkt alleen op die dag (Belgische tijd).</p>
{{confirm_button_html}}
<p style="margin:0 0 12px;font-size:14px;color:#52525b;"><strong>Afspraak annuleren</strong></p>
{{cancel_button_html}}
<p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;">Werkt een knop niet? Kopieer de link in uw browser:<br/>
<span style="word-break:break-all;color:#52525b;">Annuleren: {{cancel_url}}<br/>Bevestigen: {{confirm_url}}</span></p>
</td></tr>
<tr><td style="padding:16px 24px;background:#fafafa;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;">Class Models · Dit is een automatische bevestiging.</td></tr>
</table>
</td></tr></table>
</body></html>`;
