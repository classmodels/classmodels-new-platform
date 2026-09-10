import { publicMediaUrl, getApiBase, parseApiErrorBody } from '@/lib/api';
import type { CatalogModel } from '@/components/models-catalog/ModelsCatalogGrid';
import { loadingBegin, loadingEnd } from '@/lib/loading-bus';

function sheetStr(sh: Record<string, unknown> | undefined, key: string): string {
  if (!sh) return '';
  const v = sh[key];
  if (v == null) return '';
  return String(v).trim();
}

function escapeHtml(t: string): string {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function genderNl(g: CatalogModel['gender']): string {
  if (g === 'man') return 'Man';
  if (g === 'vrouw') return 'Vrouw';
  return '—';
}

function clientDisplayName(m: CatalogModel): string {
  return (m.displayName || '').trim() || 'Model';
}

function row(label: string, value: string): string {
  const v = value.trim() || '—';
  return `<tr><td class="lab">${escapeHtml(label)}</td><td class="val">${escapeHtml(v)}</td></tr>`;
}

const AGENCY_FOOTER = `
  <footer class="agency">
    <div class="agency-inner">
      <strong>Class-Models</strong>
      <span>Provinciebaan 3, 2235 Hulshout</span>
      <span>info@class-models.be · +32 (0) 485 322 307 · www.class-models.be</span>
    </div>
  </footer>`;

function sheetHtml(m: CatalogModel): string {
  const sh = m.sheet ?? {};
  const naam = clientDisplayName(m);
  const photoKey = m.profileThumbKey;
  const photoSrc = photoKey ? publicMediaUrl(photoKey) : '';
  const photo = photoSrc
    ? `<img class="foto" src="${escapeHtml(photoSrc)}" alt="" />`
    : `<div class="foto-placeholder">${escapeHtml(naam.slice(0, 1).toUpperCase())}</div>`;

  const besch = m.beschikbaar?.length ? m.beschikbaar.join(', ') : '—';
  const age = m.age != null && Number.isFinite(m.age) ? `${m.age} jaar` : '';
  const title = age
    ? `<h1>${escapeHtml(naam)} <span class="age">· ${escapeHtml(age)}</span></h1>`
    : `<h1>${escapeHtml(naam)}</h1>`;

  return `
  <section class="sheet">
    <div class="sheet-main">
      <div class="foto-col">${photo}</div>
      <div class="info-col">
        ${title}
        <table class="meta">
          ${row('Geslacht', genderNl(m.gender))}
          ${row('Gemeente', sheetStr(sh, 'gemeente'))}
          ${row('Nationaliteit', sheetStr(sh, 'nationaliteit'))}
          ${row('Lengte', sheetStr(sh, 'lengte'))}
          ${row('Maat', sheetStr(sh, 'maat'))}
          ${row('Confectiemaat', sheetStr(sh, 'confectiemaat'))}
          ${row('Schoenmaat', sheetStr(sh, 'schoenmaat'))}
          ${row('BH-maat', sheetStr(sh, 'bhMaat'))}
          ${row('Borstomtrek', sheetStr(sh, 'borstomtrek'))}
          ${row('Taille', sheetStr(sh, 'taille'))}
          ${row('Heupomtrek', sheetStr(sh, 'heupomtrek'))}
          ${row('Jeansmaat', sheetStr(sh, 'jeansmaat'))}
          ${row('Haarkleur', sheetStr(sh, 'haarkleur'))}
          ${row('Kleur ogen', sheetStr(sh, 'kleurOgen'))}
          ${row('Beschikbaar voor', besch)}
        </table>
      </div>
    </div>
    ${AGENCY_FOOTER}
  </section>`;
}

/** Compacte HTML-fallback (één A4). Prefer printModelSheetsPdf wanneer JWT beschikbaar is. */
const PRINT_CSS = `
  @page { size: A4 portrait; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: Helvetica, Arial, sans-serif;
    color: #1a1a1a;
    background: #fff;
  }
  .sheet {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: 281mm;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .sheet:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .sheet-main {
    display: grid;
    grid-template-columns: 42% 1fr;
    gap: 5mm;
    align-items: start;
    flex: 0 1 auto;
  }
  .foto-col {
    width: 100%;
    max-height: 215mm;
    overflow: hidden;
  }
  .foto {
    display: block;
    width: 100%;
    height: 215mm;
    max-height: 215mm;
    object-fit: cover;
    object-position: center top;
  }
  .foto-placeholder {
    width: 100%;
    height: 180mm;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0f0f0;
    font-size: 36pt;
    color: #888;
  }
  .info-col { min-width: 0; padding-top: 0; }
  h1 {
    margin: 0 0 2mm;
    font-size: 11pt;
    font-weight: 700;
    line-height: 1.2;
  }
  h1 .age { font-weight: 400; font-size: 9.5pt; color: #555; }
  table.meta { width: 100%; border-collapse: collapse; }
  table.meta td {
    padding: 0.85mm 0;
    border-bottom: 0.25pt solid #ddd;
    vertical-align: top;
  }
  td.lab {
    width: 40%;
    font-size: 5.8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #666;
    padding-right: 2mm;
  }
  td.val {
    font-size: 7.2pt;
    line-height: 1.25;
    word-break: break-word;
  }
  .agency {
    margin-top: 3mm;
    width: 100%;
    flex: 0 0 auto;
  }
  .agency-inner {
    border: 0.6pt solid #b88;
    background: #f8f6f4;
    padding: 2.4mm 3mm;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.8mm;
  }
  .agency-inner strong { font-size: 8pt; letter-spacing: 0.04em; }
  .agency-inner span { font-size: 6.8pt; color: #555; line-height: 1.3; }
`;

async function fetchModelSheetsPdfBlob(token: string, modelIds: string[]): Promise<Blob> {
  const API = getApiBase();
  const res = await fetch(`${API}/admin/catalog/model-sheets/pdf`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ modelIds }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(parseApiErrorBody(t || res.statusText));
  }
  return res.blob();
}

/** A4-print HTML-fallback. */
export function printModelSheetsForClients(models: CatalogModel[]) {
  if (!models.length) {
    window.alert('Selecteer eerst minstens één model.');
    return;
  }
  const w = window.open('', '_blank');
  if (!w) {
    window.alert('Pop-up geblokkeerd. Sta pop-ups toe om te printen.');
    return;
  }
  const title =
    models.length === 1
      ? escapeHtml(clientDisplayName(models[0]!))
      : `Selectie (${models.length} modellen)`;
  const body = models.map(sheetHtml).join('\n');
  w.document.write(
    `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"/><title>${title}</title><style>${PRINT_CSS}</style></head><body>${body}</body></html>`,
  );
  w.document.close();
  w.focus();
  const kick = () => {
    try {
      w.print();
    } finally {
      setTimeout(() => w.close(), 400);
    }
  };
  setTimeout(kick, 450);
}

/** Print dezelfde PDF als bij mailen (één A4 per model, foto bovenaan). */
export async function printModelSheetsPdf(token: string, modelIds: string[]): Promise<void> {
  if (!modelIds.length) {
    window.alert('Selecteer eerst minstens één model.');
    return;
  }
  loadingBegin('PDF maken…');
  try {
    const blob = await fetchModelSheetsPdfBlob(token, modelIds);
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (!w) {
      // Fallback: downloaden
      const a = document.createElement('a');
      a.href = url;
      a.download =
        modelIds.length === 1
          ? 'class-models-fiche.pdf'
          : `class-models-fiches-${modelIds.length}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.alert('Pop-up geblokkeerd. PDF is gedownload — open en druk af.');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }
    // Geef de PDF-viewer even tijd, print dan
    setTimeout(() => {
      try {
        w.focus();
        w.print();
      } catch {
        /* viewer regelt print zelf */
      }
      setTimeout(() => URL.revokeObjectURL(url), 120_000);
    }, 800);
  } finally {
    loadingEnd();
  }
}

export async function downloadModelSheetsPdf(token: string, modelIds: string[]): Promise<void> {
  if (!modelIds.length) {
    window.alert('Selecteer eerst minstens één model.');
    return;
  }
  loadingBegin('PDF maken…');
  try {
    const blob = await fetchModelSheetsPdfBlob(token, modelIds);
    const filename =
      modelIds.length === 1
        ? 'class-models-fiche.pdf'
        : `class-models-fiches-${modelIds.length}.pdf`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } finally {
    loadingEnd();
  }
}

export async function emailModelSheetsPdf(
  token: string,
  modelIds: string[],
  to?: string,
): Promise<void> {
  if (!modelIds.length) {
    window.alert('Selecteer eerst minstens één model.');
    return;
  }

  const draft = await promptMailSheetDetails({
    defaultTo: to ?? '',
    modelCount: modelIds.length,
  });
  if (!draft) return;

  loadingBegin('PDF mailen…');
  try {
    const API = getApiBase();
    const res = await fetch(`${API}/admin/catalog/model-sheets/email`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        modelIds,
        to: draft.to,
        message: draft.message,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(parseApiErrorBody(t || res.statusText));
    }
    window.alert(`PDF verzonden naar ${draft.to}.`);
  } finally {
    loadingEnd();
  }
}

/** Dialoog: e-mail + optionele begeleidende tekst (enters/spaties blijven behouden). */
function promptMailSheetDetails(opts: {
  defaultTo?: string;
  modelCount: number;
}): Promise<{ to: string; message: string } | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);padding:16px;';

    const card = document.createElement('div');
    card.style.cssText =
      'width:min(520px,100%);background:#fff;color:#1a1a1a;border-radius:12px;padding:20px 22px;box-shadow:0 20px 50px rgba(0,0,0,.35);font-family:Georgia,serif;';

    const title = document.createElement('h2');
    title.textContent =
      opts.modelCount === 1
        ? 'Fiche doorsturen per mail'
        : `${opts.modelCount} fiches doorsturen per mail`;
    title.style.cssText = 'margin:0 0 14px;font-size:18px;font-weight:600;';

    const labelTo = document.createElement('label');
    labelTo.textContent = 'E-mailadres';
    labelTo.style.cssText =
      'display:block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#555;margin-bottom:6px;';

    const inputTo = document.createElement('input');
    inputTo.type = 'email';
    inputTo.value = opts.defaultTo ?? '';
    inputTo.placeholder = 'naam@bedrijf.be';
    inputTo.autocomplete = 'email';
    inputTo.style.cssText =
      'width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #ccc;border-radius:8px;font-size:15px;margin-bottom:14px;';

    const labelMsg = document.createElement('label');
    labelMsg.textContent = 'Begeleidende tekst (optioneel)';
    labelMsg.style.cssText =
      'display:block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#555;margin-bottom:6px;';

    const hint = document.createElement('p');
    hint.textContent = 'Spaties en enters blijven behouden in de mail.';
    hint.style.cssText = 'margin:0 0 8px;font-size:12px;color:#777;';

    const textarea = document.createElement('textarea');
    textarea.rows = 7;
    textarea.placeholder =
      'Typ hier uw boodschap…\n\nBijv.:\nBeste …,\n\nHierbij de gevraagde fiches.';
    textarea.style.cssText =
      'width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #ccc;border-radius:8px;font-size:15px;line-height:1.45;resize:vertical;white-space:pre-wrap;font-family:Georgia,serif;margin-bottom:16px;';

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;';

    const btnCancel = document.createElement('button');
    btnCancel.type = 'button';
    btnCancel.textContent = 'Annuleren';
    btnCancel.style.cssText =
      'padding:9px 14px;border:1px solid #bbb;background:#fff;border-radius:8px;cursor:pointer;font-size:14px;';

    const btnSend = document.createElement('button');
    btnSend.type = 'button';
    btnSend.textContent = 'Versturen';
    btnSend.style.cssText =
      'padding:9px 16px;border:1px solid #1a1a1a;background:#1a1a1a;color:#fff;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;';

    const cleanup = (result: { to: string; message: string } | null) => {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      resolve(result);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cleanup(null);
    };

    btnCancel.onclick = () => cleanup(null);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(null);
    });
    btnSend.onclick = () => {
      const recipient = inputTo.value.trim();
      if (!recipient) {
        window.alert('Vul een e-mailadres in.');
        inputTo.focus();
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
        window.alert('Ongeldig e-mailadres.');
        inputTo.focus();
        return;
      }
      cleanup({ to: recipient, message: textarea.value });
    };

    actions.append(btnCancel, btnSend);
    card.append(title, labelTo, inputTo, labelMsg, hint, textarea, actions);
    overlay.append(card);
    document.body.append(overlay);
    document.addEventListener('keydown', onKey);
    (opts.defaultTo ? textarea : inputTo).focus();
  });
}
