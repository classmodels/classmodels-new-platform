/** Client-side: Belgisch gsm → nationaal `0xxxxxxxxx` (zelfde logica als API). */
export function normalizeAgendaMobileNational(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let d = raw.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('32') && d.length >= 11) {
    d = `0${d.slice(2)}`;
  }
  d = d.replace(/\D/g, '');
  if (d.length === 10 && d.startsWith('0')) return d;
  if (d.length === 9 && d.startsWith('4')) return `0${d}`;
  return null;
}

export function agendaMobileError(raw: string | null | undefined, label = 'GSM'): string | null {
  if (!raw?.trim()) return `${label} is verplicht.`;
  if (!normalizeAgendaMobileNational(raw)) {
    return `${label} moet een Belgisch gsm-nummer zijn (bv. 0498720371 of +32 498 72 03 71).`;
  }
  return null;
}

/** Normaliseer geboortedatum naar JJJJ-MM-DD. */
export function normalizeIsoBirthDateClient(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const iso = s.slice(0, 10);
    const t = Date.parse(`${iso}T12:00:00`);
    return Number.isFinite(t) ? iso : null;
  }
  const m = /^(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{4})$/.exec(s);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    const yyyy = m[3];
    const iso = `${yyyy}-${mm}-${dd}`;
    const t = Date.parse(`${iso}T12:00:00`);
    return Number.isFinite(t) ? iso : null;
  }
  return null;
}

/**
 * Bepaal het API-pad voor boekingen.
 * Voorkomt fouten als `Cannot POST /modellen?tab=portfolio` wanneer per ongeluk een site-URL werd doorgegeven.
 */
export function resolveAgendaBookPath(
  bookUrl: string | undefined,
  authToken?: string | null,
): string {
  const fallback = authToken ? '/portal/model/agenda/book-form' : '/agenda/book-form';
  const p = bookUrl?.trim();
  if (!p) return fallback;
  if (
    p.includes('?tab=') ||
    p.startsWith('/modellen') ||
    p.startsWith('/gasten') ||
    p.startsWith('/klanten') ||
    p.startsWith('/admin') ||
    !p.includes('book')
  ) {
    return fallback;
  }
  return p.startsWith('/') ? p : `/${p}`;
}

export function agendaFieldDisplayLabel(fieldKey: string, label: string): string {
  const k = fieldKey.toLowerCase();
  if (k === 'telefoon' || k === 'phone' || k === 'gsm') return 'GSM';
  if (k === 'nr' || k === 'huisnummer') return 'Nr. (huisnummer)';
  return label;
}

export function agendaFieldPlaceholder(fieldKey: string, placeholder?: string): string {
  const k = fieldKey.toLowerCase();
  if (k === 'telefoon' || k === 'phone' || k === 'gsm') return placeholder || '0498720371';
  if (k === 'nr' || k === 'huisnummer') return placeholder || 'Huisnr.';
  // Geen voorbeeld-datum: ziet eruit alsof het veld al ingevuld is.
  if (k === 'geboortedatum' || k === 'birthdate' || k === 'birth_date') return '';
  return placeholder ?? '';
}
