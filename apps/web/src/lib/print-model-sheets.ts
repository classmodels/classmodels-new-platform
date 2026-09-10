import { publicMediaUrl } from '@/lib/api';
import type { CatalogModel } from '@/components/models-catalog/ModelsCatalogGrid';

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
  return `<div class="row"><span class="lab">${escapeHtml(label)}</span><span class="val">${escapeHtml(v)}</span></div>`;
}

function sheetHtml(m: CatalogModel): string {
  const sh = m.sheet ?? {};
  const naam = clientDisplayName(m);
  const photoKey = m.profileThumbKey;
  const photoSrc = photoKey ? publicMediaUrl(photoKey) : '';
  const photo = photoSrc
    ? `<img class="foto" src="${escapeHtml(photoSrc)}" alt="" />`
    : `<div class="foto-placeholder">${escapeHtml(naam.slice(0, 1).toUpperCase())}</div>`;

  const besch = m.beschikbaar?.length ? m.beschikbaar.join(', ') : '—';
  const age = m.age != null && Number.isFinite(m.age) ? `${m.age} jaar` : '—';

  return `
  <section class="sheet">
    <div class="foto-col">${photo}</div>
    <div class="info-col">
      <h1>${escapeHtml(naam)}</h1>
      ${row('Geslacht', genderNl(m.gender))}
      ${row('Leeftijd', age)}
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
      ${row('Ervaring', sheetStr(sh, 'ervaringen'))}
      ${row('Over mij', sheetStr(sh, 'overMij'))}
      ${row('Beschikbaar voor', besch)}
    </div>
  </section>`;
}

const PRINT_CSS = `
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Georgia, 'Times New Roman', serif;
    color: #1a1a1a;
    background: #fff;
  }
  .sheet {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 14mm;
    min-height: 260mm;
    page-break-after: always;
    break-after: page;
  }
  .sheet:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .foto-col {
    flex: 0 0 48%;
    max-width: 48%;
  }
  .foto {
    display: block;
    width: 100%;
    height: auto;
    max-height: 250mm;
    object-fit: cover;
    object-position: center top;
    border-radius: 2mm;
  }
  .foto-placeholder {
    width: 100%;
    min-height: 180mm;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0f0f0;
    font-size: 48pt;
    color: #888;
    border-radius: 2mm;
  }
  .info-col {
    flex: 1 1 48%;
    min-width: 0;
  }
  h1 {
    margin: 0 0 8mm;
    font-size: 18pt;
    font-weight: 600;
    line-height: 1.2;
  }
  .row {
    display: grid;
    grid-template-columns: 38% 1fr;
    gap: 3mm 4mm;
    padding: 2.6mm 0;
    border-bottom: 0.3pt solid #ddd;
    align-items: start;
  }
  .lab {
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #555;
    line-height: 1.45;
  }
  .val {
    font-size: 11pt;
    line-height: 1.55;
    white-space: pre-wrap;
    word-break: break-word;
  }
`;

/** A4-print voor klanten: foto links, gegevens rechts. Geen e-mail, tel of adres. */
export function printModelSheetsForClients(models: CatalogModel[]) {
  if (!models.length) return;
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
  w.document.write(`<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"/><title>${title}</title><style>${PRINT_CSS}</style></head><body>${body}</body></html>`);
  w.document.close();
  w.focus();
  const kick = () => {
    try {
      w.print();
    } finally {
      setTimeout(() => w.close(), 400);
    }
  };
  // Wacht kort zodat foto’s kunnen laden
  setTimeout(kick, 450);
}
