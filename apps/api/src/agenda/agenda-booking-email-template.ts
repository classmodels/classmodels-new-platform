/**
 * Standaard HTML voor agenda-bevestigingsmail (placeholders met {{naam}} of {naam}).
 * **Houd gelijk met** `packages/shared/src/agenda-booking-email-template.ts` (web admin gebruikt @cm/shared).
 */
export const AGENDA_DEFAULT_BOOKING_EMAIL_HTML = `<p style="margin:0 0 12px;text-align:left;">Beste {{client_name}},</p>
<p style="margin:0 0 16px;text-align:left;">Uw afspraak is ingepland. Hieronder vindt u de gegevens en knoppen om te annuleren of — op de dag vóór uw bezoek — uw komst te bevestigen.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid #e4e4e7;border-radius:6px;margin-bottom:20px;">
<tr><td style="padding:14px 16px;text-align:left;">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#71717a;margin-bottom:4px;">Type</div>
<div style="font-weight:600;">{{calendar_title}}</div>
<div style="margin-top:12px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#71717a;">Datum &amp; uur</div>
<div style="font-weight:600;">{{appointment_date}} om {{appointment_time}}</div>
</td></tr></table>
{{maps_route_block_html}}
<p style="margin:0 0 16px;font-size:14px;color:#52525b;text-align:left;"><strong>Komst bevestigen</strong><br/>
Op de dag <em>vóór</em> uw afspraak kunt u via onderstaande knop laten weten dat u komt. De knop werkt alleen op die dag (Belgische tijd).</p>
{{confirm_button_html}}
<p style="margin:0 0 12px;font-size:14px;color:#52525b;text-align:left;"><strong>Afspraak annuleren</strong></p>
{{cancel_button_html}}
<p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;text-align:left;">Werkt een knop niet? Kopieer de link in uw browser:<br/>
<span style="word-break:break-all;color:#52525b;">Annuleren: {{cancel_url}}<br/>Bevestigen: {{confirm_url}}</span></p>
<p style="margin:24px 0 0;font-size:12px;color:#71717a;text-align:left;border-top:1px solid #e4e4e7;padding-top:16px;">class-Models · Dit is een automatische bevestiging.</p>`;

/** Standaard HTML wanneer admin een bestaande afspraak wijzigt. */
export const AGENDA_DEFAULT_BOOKING_UPDATED_EMAIL_HTML = `<p style="margin:0 0 12px;text-align:left;">Beste {{client_name}},</p>
<p style="margin:0 0 16px;text-align:left;">Uw afspraak bij Class-Models is aangepast. Hieronder vindt u de actuele gegevens.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid #e4e4e7;border-radius:6px;margin-bottom:20px;">
<tr><td style="padding:14px 16px;text-align:left;">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#71717a;margin-bottom:4px;">Type</div>
<div style="font-weight:600;">{{calendar_title}}</div>
<div style="margin-top:12px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#71717a;">Datum &amp; uur</div>
<div style="font-weight:600;">{{appointment_date}} om {{appointment_time}}</div>
</td></tr></table>
{{maps_route_block_html}}
<p style="margin:0 0 12px;font-size:14px;color:#52525b;text-align:left;"><strong>Afspraak annuleren</strong></p>
{{cancel_button_html}}
<p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;text-align:left;">Werkt een knop niet? Kopieer de link in uw browser:<br/>
<span style="word-break:break-all;color:#52525b;">Annuleren: {{cancel_url}}</span></p>
<p style="margin:24px 0 0;font-size:12px;color:#71717a;text-align:left;border-top:1px solid #e4e4e7;padding-top:16px;">class-Models · Dit is een automatische melding.</p>`;
