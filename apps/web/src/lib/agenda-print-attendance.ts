import { ageFromIsoBirthYmd } from '@/lib/agenda-booking-detail';
import { normalizeIsoBirthDateClient } from '@/lib/agenda-phone';

export type AttendancePrintRow = {
  firstname: string | null;
  lastname: string | null;
  name: string | null;
  phone: string | null;
  fieldsJson?: Record<string, unknown> | null;
  /** Optioneel: groepstitel (agenda + moment) boven de rij. */
  groupLabel?: string | null;
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Leeftijd uit geboortedatum in fieldsJson, of rechtstreeks veld `leeftijd`. */
export function bookingAgeLabel(fieldsJson?: Record<string, unknown> | null): string {
  const fj = fieldsJson && typeof fieldsJson === 'object' ? fieldsJson : {};
  const leeftijdDirect = String(fj.leeftijd ?? '').trim();
  if (/^\d{1,3}$/.test(leeftijdDirect)) return leeftijdDirect;

  const gebRaw = String(fj.geboortedatum ?? fj.birthdate ?? fj.birth_date ?? '').trim();
  if (!gebRaw) return '—';
  const iso =
    normalizeIsoBirthDateClient(gebRaw) ?? (/^\d{4}-\d{2}-\d{2}$/.test(gebRaw) ? gebRaw : null);
  const age = iso ? ageFromIsoBirthYmd(iso) : null;
  return age != null ? String(age) : '—';
}

export function attendanceDisplayName(row: AttendancePrintRow): {
  voornaam: string;
  naam: string;
} {
  const voornaam = (row.firstname ?? '').trim() || '—';
  const naam =
    (row.lastname ?? '').trim() ||
    (() => {
      const full = (row.name ?? '').trim();
      if (!full) return '—';
      const parts = full.split(/\s+/).filter(Boolean);
      if (parts.length <= 1) return full;
      return parts.slice(1).join(' ');
    })();
  return { voornaam, naam };
}

function buildAttendanceHtml(
  rows: AttendancePrintRow[],
  opts?: { title?: string; subtitle?: string },
): string {
  const title = opts?.title?.trim() || 'Aanwezigheidslijst';
  const subtitle = opts?.subtitle?.trim() || '';

  const bodyRows = rows
    .map((r) => {
      const { voornaam, naam } = attendanceDisplayName(r);
      const gsm = (r.phone ?? '').trim() || '—';
      const age = bookingAgeLabel(r.fieldsJson);
      const group = (r.groupLabel ?? '').trim();
      const groupRow = group
        ? `<tr class="group"><td colspan="4">${esc(group)}</td></tr>`
        : '';
      return `${groupRow}<tr>
        <td>${esc(voornaam)}</td>
        <td>${esc(naam)}</td>
        <td>${esc(gsm)}</td>
        <td>${esc(age)}</td>
      </tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>
    @page { margin: 12mm; }
    body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; color: #111; font-size: 12pt; margin: 0; padding: 8px; }
    h1 { font-size: 16pt; margin: 0 0 4px; }
    .sub { color: #444; font-size: 10pt; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f3f3f3; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.02em; }
    tr.group td { border: none; padding-top: 14px; padding-bottom: 4px; font-weight: 700; font-size: 10pt; color: #333; background: transparent; }
  </style>
</head>
<body>
  <h1>${esc(title)}</h1>
  ${subtitle ? `<p class="sub">${esc(subtitle)}</p>` : ''}
  <table>
    <thead>
      <tr>
        <th>Voornaam</th>
        <th>Naam</th>
        <th>GSM</th>
        <th>Leeftijd</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
  </table>
</body>
</html>`;
}

/**
 * Drukt aanwezigheidslijst af zonder pop-up (iframe in dezelfde pagina).
 * Werkt op Safari / Apple zonder “pop-ups toestaan”.
 */
export function printAttendanceList(
  rows: AttendancePrintRow[],
  opts?: { title?: string; subtitle?: string },
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!rows.length) {
    window.alert('Selecteer minstens één afspraak om af te drukken.');
    return;
  }

  const html = buildAttendanceHtml(rows, opts);
  const iframeId = 'cm-attendance-print-frame';
  let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
  if (iframe) iframe.remove();

  iframe = document.createElement('iframe');
  iframe.id = iframeId;
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    window.alert('Afdrukken lukte niet. Probeer opnieuw of gebruik een andere browser.');
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const runPrint = () => {
    try {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    } catch {
      window.alert('Afdrukken lukte niet. Probeer opnieuw.');
    } finally {
      // Even laten staan zodat Safari het print-dialoog kan openen.
      window.setTimeout(() => iframe?.remove(), 60_000);
    }
  };

  // Safari heeft even nodig na document.write.
  window.setTimeout(runPrint, 100);
}
