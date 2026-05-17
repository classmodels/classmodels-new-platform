import { hasMeaningfulRichMarkup, sanitizeCmsHtml } from '@/lib/sanitize-cms-html';

/** Lees waarde uit een contenteditable voor CMS-opslag. */
export function readContentEditableValue(el: HTMLElement): string {
  if (hasMeaningfulRichMarkup(el)) return sanitizeCmsHtml(el.innerHTML);
  return el.innerText;
}
