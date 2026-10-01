/** Sync met packages/shared/src/email-layout.ts */
/** Breedte inhoud (zoals huisstijl-mail). */
export const CM_EMAIL_CONTENT_WIDTH = 680;

const SITE = 'https://www.class-models.be';
const GOLD = '#c2a164';
const GOLD_LINE = '#695936';
const DARK = '#191919';
const CREAM = '#f7f4ed';
const OUTER = '#ece7df';
const MUTED = '#c8c6c1';
const INK = '#262420';

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
  const marked = t.match(/<!--\s*BEGIN CM BODY\s*-->([\s\S]*?)<!--\s*EINDE CM BODY\s*-->/i);
  if (marked) return marked[1].trim();
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

function emailHeaderBlock(): string {
  return `
<tr><td class="pad" bgcolor="${DARK}" align="right" style="padding:10px 40px 0;text-align:right;">
  <p class="nav" style="margin:0;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:16px;">
    <a href="${SITE}/gasten/model-worden" style="color:${MUTED};">Model worden</a><span style="color:#716e67;">&nbsp; | &nbsp;</span><a href="${SITE}/modellen" style="color:${MUTED};">Modellenportaal</a><span style="color:#716e67;">&nbsp; | &nbsp;</span><a href="${SITE}/klanten" style="color:${MUTED};">Klantenportaal</a>
  </p>
</td></tr>
<tr><td class="pad" bgcolor="${DARK}" style="padding:8px 40px 18px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="88" style="width:88px;padding-right:12px;border-right:1px solid ${GOLD_LINE};color:${GOLD};vertical-align:middle;text-align:center;">
      <span style="display:block;font-family:Georgia,'Times New Roman',serif;font-size:35px;line-height:39px;">CM</span>
      <span style="display:block;padding-top:3px;font-family:Arial,Helvetica,sans-serif;font-size:9px;line-height:13px;letter-spacing:0.2px;white-space:nowrap;color:${MUTED};">Modeling Agency</span>
    </td>
    <td style="padding-left:20px;">
      <a href="${SITE}/" style="color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:33px;line-height:38px;text-decoration:none;">Class-Models</a>
      <div style="padding-top:5px;color:${GOLD};font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:17px;letter-spacing:2px;">TOEGANKELIJK. EERLIJK. PROFESSIONEEL.</div>
    </td>
  </tr></table>
</td></tr>`;
}

function emailFooterBlock(opts?: { includeUnsubscribe?: boolean }): string {
  const unsub = opts?.includeUnsubscribe
    ? `<table role="presentation" width="100%" style="margin-top:26px;"><tr>
      <td class="stack" valign="top" style="color:#a6a29a;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:18px;">© ${new Date().getFullYear()} Class-Models. Alle rechten voorbehouden.</td>
      <td class="stack" align="right" valign="top" style="text-align:right;color:#a6a29a;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:18px;">Wilt u deze mail niet meer ontvangen?&nbsp;&nbsp; <a href="{{uitschrijflink}}" style="color:#a6a29a;text-decoration:underline;">Uitschrijven</a></td>
    </tr></table>`
    : `<p style="margin:26px 0 0;color:#a6a29a;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:18px;">© ${new Date().getFullYear()} Class-Models. Alle rechten voorbehouden.</p>`;

  return `
<tr><td class="pad" bgcolor="${DARK}" style="padding:36px 40px 30px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td class="stack" width="340" valign="top" style="width:340px;padding-right:22px;">
      <p style="margin:0 0 10px;color:${GOLD};font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;letter-spacing:2px;">PERSOONLIJK. DICHTBIJ.</p>
      <h2 style="margin:0 0 17px;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:36px;font-weight:normal;">Van eerste stap<br>tot nieuwe kansen.</h2>
      <p style="margin:0;color:${GOLD};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;line-height:20px;font-weight:300;">Al meer dan 20 jaar begeleiden we mensen met uitstraling. Met of zonder ervaring.</p>
    </td>
    <td class="stack footer-side" width="260" valign="top" style="width:260px;border-left:1px solid ${GOLD_LINE};padding-left:24px;">
      <p style="margin:0 0 12px;color:${GOLD};font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;letter-spacing:2px;">CLASS-MODELS</p>
      <p style="margin:0 0 12px;color:${MUTED};font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:19px;">Provinciebaan 3<br>2235 Hulshout · België</p>
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:19px;"><a href="${SITE}/" style="color:${GOLD};">www.class-models.be</a><br><a href="mailto:info@class-models.be" style="color:${GOLD};">info@class-models.be</a></p>
      <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;"><a href="tel:+32485322307" style="color:${GOLD};">+32 485 32 23 07</a></p>
    </td>
  </tr></table>
  ${unsub}
</td></tr>`;
}

export type BuildClassModelsEmailOptions = {
  /** Nieuwsbrief: toon uitschrijflink. */
  includeUnsubscribe?: boolean;
  /** Concrete uitschrijflink (vervangt {{uitschrijflink}}). */
  unsubscribeUrl?: string;
  title?: string;
};

/** Volledige HTML-mail: huisstijl-header + body + footer. */
export function buildClassModelsEmailDocument(
  bodyHtml: string,
  opts?: BuildClassModelsEmailOptions,
): string {
  const body = normalizeEmailContentAlignment(bodyHtml.trim() || '<p></p>');
  const w = CM_EMAIL_CONTENT_WIDTH;
  const title = escHtml(opts?.title || 'Class-Models');
  const doc = `<!doctype html>
<html lang="nl"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; }
    table { border-collapse:collapse; }
    a { text-decoration:none; }
    @media only screen and (max-width:600px) {
      .outer { padding:0 !important; }
      .container { width:100% !important; }
      .pad { padding-left:26px !important; padding-right:26px !important; }
      .stack { display:block !important; width:100% !important; box-sizing:border-box; }
      .footer-side { padding-top:26px !important; border-left:0 !important; padding-left:0 !important; }
      .nav { font-size:10px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${OUTER};">
<!-- cm-email-shell-v2 -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${OUTER}">
<tbody><tr><td class="outer" align="center" style="padding:32px 16px;">
<!--[if mso]><table role="presentation" width="${w}" align="center"><tr><td><![endif]-->
<table role="presentation" class="container" width="${w}" cellpadding="0" cellspacing="0" style="width:100%;max-width:${w}px;">
  <tbody>
  ${emailHeaderBlock()}
  <tr><td class="pad" bgcolor="${CREAM}" style="padding:38px 40px 40px;border-left:1px solid ${GOLD};border-right:1px solid ${GOLD};color:${INK};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:27px;">
    <!-- BEGIN CM BODY -->
    <div style="color:${INK};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:27px;text-align:left;">${body}</div>
    <!-- EINDE CM BODY -->
  </td></tr>
  ${emailFooterBlock({ includeUnsubscribe: opts?.includeUnsubscribe })}
  </tbody>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></tbody></table>
</body></html>`;
  if (opts?.unsubscribeUrl?.trim()) {
    return doc.split('{{uitschrijflink}}').join(escHtml(opts.unsubscribeUrl.trim()));
  }
  return doc;
}

/** Wrapt fragment, platte tekst of bestaand HTML-document in het Class-Models-mailtemplate. */
export function coerceOutgoingEmailHtml(
  inner: string,
  opts?: BuildClassModelsEmailOptions,
): string {
  const t = (inner ?? '').trim();
  if (!t) return buildClassModelsEmailDocument('', opts);
  if (t.includes('cm-email-shell-v2')) return t;
  if (!t.includes('<')) {
    const body = escHtml(t).replace(/\r\n/g, '\n').replace(/\n/g, '<br/>\n');
    return buildClassModelsEmailDocument(body, opts);
  }
  const content = extractEmailBodyContent(t);
  return buildClassModelsEmailDocument(content, opts);
}
