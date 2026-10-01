import { coerceOutgoingEmailHtml } from '../mail/email-layout';

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function webPublicBaseUrl(): string {
  return (process.env.WEB_PUBLIC_URL || process.env.WEB_APP_URL || 'https://www.class-models.be').replace(
    /\/$/,
    '',
  );
}

export function wrapBulkMailHtml(
  innerHtml: string,
  displayName?: string | null,
  unsubscribeUrl?: string | null,
): string {
  const name = displayName?.trim();
  const greeting = name
    ? `<p style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:32px;color:#191919;">Beste ${escHtml(name)},</p>`
    : `<p style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:32px;color:#191919;">Beste,</p>`;
  const body = (innerHtml || '').trim() || '<p></p>';
  const unsub = unsubscribeUrl?.trim()
    ? `<p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:20px;color:#857f74;text-align:left;"><a href="${escHtml(unsubscribeUrl.trim())}" style="color:#857f74;text-decoration:underline;">Uitschrijven van deze e-mails</a></p>`
    : '';
  // Shell bevat al header/footer; geen tweede adresblok toevoegen.
  return coerceOutgoingEmailHtml(
    `${greeting}<div style="margin-top:4px;text-align:left;color:#262420;font-size:16px;line-height:27px;">${body}</div>${unsub}`,
    {
      includeUnsubscribe: Boolean(unsubscribeUrl?.trim()),
      unsubscribeUrl: unsubscribeUrl?.trim() || undefined,
    },
  );
}

export function appendTrackingPixel(html: string, trackingUrl: string): string {
  const pixel = `<img src="${trackingUrl.replace(/"/g, '&quot;')}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${pixel}</body>`);
  if (/<\/html>/i.test(html)) return html.replace(/<\/html>/i, `${pixel}</html>`);
  return `${html}${pixel}`;
}

export function trackingBaseUrl(): string {
  const explicit = process.env.API_PUBLIC_URL?.replace(/\/$/, '');
  if (explicit) return explicit;
  const web = (process.env.WEB_PUBLIC_URL || process.env.WEB_APP_URL || 'https://www.class-models.be').replace(
    /\/$/,
    '',
  );
  return `${web}/__cm_api`;
}
