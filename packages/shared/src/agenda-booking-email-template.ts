/**
 * Standaard HTML-inhoud voor agenda-bevestigingsmail (placeholders {{naam}} of {naam}).
 * Wordt door coerceOutgoingEmailHtml in de Class-Models-mailwrapper gezet.
 */
export const AGENDA_DEFAULT_BOOKING_EMAIL_HTML = `<p style="margin:0 0 18px;text-align:left;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:32px;color:#191919;">Beste {{client_name}},</p>
<p style="margin:0 0 22px;text-align:left;color:#262420;font-size:16px;line-height:27px;">Uw afspraak bij Class-Models is bevestigd. Hieronder vindt u de details. Op de dag vóór uw bezoek kunt u uw komst bevestigen; annuleren kan via dezelfde knoppenrij.</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid #c2a164;margin:0 0 22px;background:#ffffff;">
<tr><td style="padding:16px 18px;text-align:left;">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#856b3f;margin-bottom:4px;">Type</div>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:600;color:#191919;">{{calendar_title}}</div>
<div style="margin-top:14px;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#856b3f;">Datum &amp; uur</div>
<div style="font-weight:600;color:#191919;font-size:16px;">{{appointment_date}} · {{appointment_time}}</div>
</td></tr></table>
{{maps_route_block_html}}
<p style="margin:0 0 14px;font-size:14px;color:#525049;text-align:left;line-height:22px;">Bevestig uw komst de dag vóór de afspraak, of annuleer indien nodig:</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 22px;"><tr>
<td style="padding:0 10px 0 0;vertical-align:middle;">{{confirm_button_html}}</td>
<td style="padding:0;vertical-align:middle;">{{cancel_button_html}}</td>
</tr></table>
<p style="margin:0 0 0;font-size:12px;color:#857f74;text-align:left;line-height:20px;">Werkt een knop niet? Gebruik deze links:<br/>
<span style="word-break:break-all;color:#525049;">Bevestigen: {{confirm_url}}<br/>Annuleren: {{cancel_url}}</span></p>
<p style="margin:28px 0 0;color:#262420;font-size:16px;line-height:27px;">Met vriendelijke groeten,<br/>Het Class-Models-team</p>`;

/** Standaard HTML wanneer admin een bestaande afspraak wijzigt. */
export const AGENDA_DEFAULT_BOOKING_UPDATED_EMAIL_HTML = `<p style="margin:0 0 18px;text-align:left;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:32px;color:#191919;">Beste {{client_name}},</p>
<p style="margin:0 0 22px;text-align:left;color:#262420;font-size:16px;line-height:27px;">Uw afspraak bij Class-Models is aangepast. Hieronder ziet u wat er is gewijzigd en de actuele gegevens.</p>
{{changes_block_html}}
<p style="margin:0 0 12px;text-align:left;font-size:14px;color:#525049;"><strong>Actuele afspraak</strong></p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid #c2a164;margin:0 0 22px;background:#ffffff;">
<tr><td style="padding:16px 18px;text-align:left;">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#856b3f;margin-bottom:4px;">Type</div>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:600;color:#191919;">{{calendar_title}}</div>
<div style="margin-top:14px;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#856b3f;">Datum &amp; uur</div>
<div style="font-weight:600;color:#191919;font-size:16px;">{{appointment_date}} · {{appointment_time}}</div>
</td></tr></table>
{{maps_route_block_html}}
<p style="margin:0 0 14px;font-size:14px;color:#525049;text-align:left;">Wilt u annuleren?</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 22px;"><tr>
<td style="padding:0;vertical-align:middle;">{{cancel_button_html}}</td>
</tr></table>
<p style="margin:0;font-size:12px;color:#857f74;text-align:left;">Werkt de knop niet? <span style="word-break:break-all;color:#525049;">{{cancel_url}}</span></p>
<p style="margin:28px 0 0;color:#262420;font-size:16px;line-height:27px;">Met vriendelijke groeten,<br/>Het Class-Models-team</p>`;
