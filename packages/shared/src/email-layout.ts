/** Breedte witte inhoud. */
export const CM_EMAIL_CONTENT_WIDTH = 800;

/** Site-stijl: warme donkere header + goud (niet rood/blauw). */
const HEADER_BG = '#0e0d0d';
const BRAND_GOLD = '#d4af6a';
const HEADER_MUTED = '#9a917f';

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
<td style="background:${HEADER_BG};padding:16px 28px;text-align:left;border-bottom:2px solid ${BRAND_GOLD};">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:${BRAND_GOLD};line-height:1.2;">Class-Models</div>
<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:${HEADER_MUTED};margin-top:4px;">Modeling Agency</div>
</td>
</tr>`;
}

/** Volledige HTML-mail met donkere goud-header + witte inhoud, links uitgelijnd. */
export function buildClassModelsEmailDocument(bodyHtml: string): string {
  const body = normalizeEmailContentAlignment(bodyHtml.trim() || '<p></p>');
  const w = CM_EMAIL_CONTENT_WIDTH;
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Class-Models</title></head>
<body style="margin:0;padding:0;background:#eceae6;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eceae6;padding:24px 16px;">
<tr><td align="center" style="padding:0;">
<table role="presentation" width="${w}" cellspacing="0" cellpadding="0" style="width:100%;max-width:${w}px;background:#ffffff;border:1px solid #e0d9ce;border-collapse:collapse;">
${emailHeaderRow()}
<tr>
<td style="padding:28px 32px;background:#ffffff;color:#26221e;font-size:15px;line-height:1.7;text-align:left;">
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
  /** Al een volledige Class-Models-mail (eigen header) → niet opnieuw wrappen. */
  if (/Class-Models/i.test(t) && /border-bottom:\s*2px\s+solid/i.test(t) && /<!DOCTYPE/i.test(t)) {
    return t;
  }
  const content = extractEmailBodyContent(t);
  return buildClassModelsEmailDocument(content);
}
