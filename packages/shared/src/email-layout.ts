/** Breedte witte inhoud (zoals WordPress-mail / bijlage 2). */
export const CM_EMAIL_CONTENT_WIDTH = 800;

const HEADER_BG = '#0a1628';
const BRAND_RED = '#9a1c28';

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Verwijdert centrering uit editor-/TinyMCE-HTML. */
export function normalizeEmailContentAlignment(html: string): string {
  return html
    .replace(/text-align\s*:\s*center/gi, 'text-align:left')
    .replace(/\salign\s*=\s*["']center["']/gi, ' align="left"')
    .replace(/<center\b/gi, '<div style="text-align:left"')
    .replace(/<\/center>/gi, '</div>');
}

/** Haalt inhoud uit volledige HTML-documenten (herbruik wrapper). */
export function extractEmailBodyContent(html: string): string {
  const t = html.trim();
  const bodyMatch = t.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) return bodyMatch[1].trim();
  if (/^<!DOCTYPE/i.test(t) || /^<html/i.test(t)) {
    return t
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .replace(/<\/?html[^>]*>/gi, '')
      .replace(/<head[\s\S]*?<\/head>/gi, '')
      .trim();
  }
  return t;
}

function emailHeaderRow(): string {
  return `<tr>
<td style="background:${HEADER_BG};padding:18px 28px;text-align:left;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:${BRAND_RED};line-height:1.15;">class-Models</div>
<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:11px;color:#b8c0cc;margin-top:4px;">Modeling Agency</div>
</td>
</tr>`;
}

/** Volledige HTML-mail met donkerblauwe balk + witte inhoud 800px, links uitgelijnd. */
export function buildClassModelsEmailDocument(bodyHtml: string): string {
  const body = normalizeEmailContentAlignment(bodyHtml.trim() || '<p></p>');
  const w = CM_EMAIL_CONTENT_WIDTH;
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Class-Models</title></head>
<body style="margin:0;padding:0;background:#e8e8ec;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e8e8ec;padding:24px 16px;">
<tr><td align="center" style="padding:0;">
<table role="presentation" width="${w}" cellspacing="0" cellpadding="0" style="width:100%;max-width:${w}px;background:#ffffff;border:1px solid #d4d4d8;border-collapse:collapse;">
${emailHeaderRow()}
<tr>
<td style="padding:28px 32px;background:#ffffff;color:#18181b;font-size:15px;line-height:1.6;text-align:left;">
<div style="text-align:left;">${body}</div>
</td>
</tr>
</table>
</td></tr></table>
</body></html>`;
}

/** Wrapt fragment, platte tekst of bestaand HTML-document in het Class-Models-mailtemplate. */
export function coerceOutgoingEmailHtml(inner: string): string {
  const t = (inner ?? '').trim();
  if (!t) return buildClassModelsEmailDocument('');
  if (!t.includes('<')) {
    const body = escHtml(t).replace(/\r\n/g, '\n').replace(/\n/g, '<br/>\n');
    return buildClassModelsEmailDocument(body);
  }
  const content = extractEmailBodyContent(t);
  return buildClassModelsEmailDocument(content);
}
