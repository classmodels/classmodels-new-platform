/**
 * Beperkte HTML voor CMS-teksten (alleen beheerders mogen schrijven).
 * Verwijdert scripts, event-handlers en onbekende tags/attributen.
 */

const ALLOWED_TAGS = new Set([
  'DIV',
  'SPAN',
  'FONT',
  'BR',
  'B',
  'I',
  'U',
  'STRONG',
  'EM',
  'P',
]);

function filterStyle(style: string): string {
  return style
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => {
      const m = /^([\w-]+)\s*:\s*(.+)$/i.exec(s);
      if (!m) return false;
      const prop = m[1].toLowerCase();
      const val = m[2].trim();
      if (prop === 'color') return /^[#a-z0-9(),.%+\s-]+$/i.test(val) && val.length < 80;
      if (prop === 'font-size') return /^[\d.]+\s*(px|em|rem|%)$/i.test(val) && val.length < 24;
      return false;
    })
    .join('; ');
}

function stripUnsafeAttributes(el: Element) {
  const tag = el.tagName;
  for (const attr of Array.from(el.attributes)) {
    const n = attr.name.toLowerCase();
    if (n.startsWith('on')) {
      el.removeAttribute(attr.name);
      continue;
    }
    if (n === 'style' && (tag === 'SPAN' || tag === 'FONT' || tag === 'DIV' || tag === 'P')) {
      const safe = filterStyle(attr.value);
      if (safe) el.setAttribute('style', safe);
      else el.removeAttribute('style');
      continue;
    }
    if (tag === 'FONT' && n === 'size') {
      const sz = parseInt(attr.value, 10);
      if (sz >= 1 && sz <= 7) continue;
      el.removeAttribute('size');
      continue;
    }
    if (tag === 'FONT' && n === 'color') {
      if (/^#[0-9a-f]{3,8}$/i.test(attr.value) || /^[a-z]+$/i.test(attr.value)) continue;
      el.removeAttribute('color');
      continue;
    }
    el.removeAttribute(attr.name);
  }
}

function sanitizeElement(el: Element) {
  const children = Array.from(el.children);
  for (const child of children) {
    if (!ALLOWED_TAGS.has(child.tagName)) {
      while (child.firstChild) el.insertBefore(child.firstChild, child);
      child.remove();
      continue;
    }
    stripUnsafeAttributes(child);
    sanitizeElement(child);
  }
}

export function looksLikeCmsRichHtml(s: string): boolean {
  return /<\s*(span|font|br|b|i|u|strong|em|div|p)\b/i.test(s);
}

/** Voor SSR / eerste paint zonder DOM: toon platte tekst met regeleinden. */
export function cmsHtmlToPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '');
}

export function sanitizeCmsHtml(input: string): string {
  if (!input) return '';
  if (typeof window === 'undefined') {
    return cmsHtmlToPlainText(input);
  }
  const doc = new DOMParser().parseFromString(`<div id="cms-root">${input}</div>`, 'text/html');
  const root = doc.getElementById('cms-root');
  if (!root) return '';
  sanitizeElement(root);
  return root.innerHTML;
}
