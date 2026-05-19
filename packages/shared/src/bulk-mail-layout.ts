import { coerceOutgoingEmailHtml } from './agenda-mail-placeholders';

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const BULK_MAIL_FOOTER_HTML = `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:48px;border-top:1px solid #e4e4e7;padding-top:24px;">
  <tr>
    <td style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:13px;line-height:1.65;color:#52525b;">
      <p style="margin:0 0 8px;"><a href="https://www.class-models.be" style="color:#111827;text-decoration:none;font-weight:600;">www.class-models.be</a></p>
      <p style="margin:0 0 4px;">Provinciebaan 3, 2235 Hulshout</p>
      <p style="margin:0 0 4px;">GSM <a href="tel:+32485322307" style="color:#52525b;text-decoration:none;">+32 (0) 485 322 307</a></p>
      <p style="margin:0;"><a href="mailto:info@class-models.be" style="color:#52525b;text-decoration:none;">info@class-models.be</a></p>
    </td>
  </tr>
</table>`;

/** Wraps editor body with greeting + footer (not shown in TinyMCE). */
export function wrapBulkMailHtml(innerHtml: string, displayName?: string | null): string {
  const name = displayName?.trim();
  const greeting = name
    ? `<p style="margin:0 0 24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.55;color:#18181b;">Beste ${escHtml(name)},</p>`
    : `<p style="margin:0 0 24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.55;color:#18181b;">Beste,</p>`;

  const body = (innerHtml || '').trim() || '<p></p>';
  const inner = `${greeting}<div style="margin-top:8px">${body}</div>${BULK_MAIL_FOOTER_HTML}`;
  return coerceOutgoingEmailHtml(inner);
}

export function appendBulkMailTrackingPixel(html: string, trackingUrl: string): string {
  const safeUrl = trackingUrl.replace(/"/g, '&quot;');
  const pixel = `<img src="${safeUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;margin:0;padding:0;" />`;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${pixel}</body>`);
  if (/<\/html>/i.test(html)) return html.replace(/<\/html>/i, `${pixel}</html>`);
  return `${html}${pixel}`;
}
