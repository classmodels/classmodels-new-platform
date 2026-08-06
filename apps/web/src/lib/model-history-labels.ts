/** Nederlandse labels voor `portal.model.history.*` audit-acties (admin + modellenportaal). */

export function historyKind(action: string): string {
  return action.replace(/^portal\.model\.history\./, '');
}

export function historyTitle(action: string, meta?: unknown): string {
  const m = meta && typeof meta === 'object' && !Array.isArray(meta) ? (meta as Record<string, unknown>) : {};
  const slug = String(m.calendarSlug ?? '');
  const k = historyKind(action);
  const isPortfolio = slug.includes('portfolio');
  const isEdu = /opleiding|intake|opleidings/i.test(slug);
  switch (k) {
    case 'agenda_booked':
      if (isPortfolio) return 'Portfolio-afspraak gemaakt';
      if (isEdu) return 'Opleidingsafspraak gemaakt';
      return 'Afspraak gemaakt';
    case 'agenda_cancelled':
    case 'agenda_cancelled_via_link':
      if (isPortfolio) return 'Portfolio-afspraak verwijderd';
      if (isEdu) return 'Opleidingsafspraak verwijderd';
      return k === 'agenda_cancelled_via_link' ? 'Afspraak geannuleerd (via link)' : 'Afspraak verwijderd';
    case 'agenda_attendance_confirmed':
      if (isPortfolio) return 'Portfolio-afspraak bevestigd';
      if (isEdu) return 'Opleidingsafspraak bevestigd';
      return 'Afspraak bevestigd (komst)';
    case 'portfolio_download_ack':
      return 'Portfolio-download bevestigd';
    case 'portfolio_photo_uploaded':
      return 'Portfoliofoto geüpload';
    case 'portfolio_shoot_zip_downloaded':
      return 'Portfolio-shoot gedownload (ZIP)';
    case 'profile_updated':
      return 'Profiel / modellenfiche aangepast';
    case 'brief_interest_submitted':
      return 'Interesse opdracht ingediend';
    case 'brief_interest_withdrawn':
      return 'Interesse opdracht ingetrokken';
    case 'brief_selection_accepted':
      return 'Opdracht — geselecteerd';
    case 'brief_selection_declined':
      return 'Opdracht — niet geselecteerd';
    case 'message_mailto':
      return 'Bericht naar Class-Models (gestart)';
    case 'message_sent':
      return 'Bericht naar Class-Models';
    case 'premium_paid':
      return 'Premium betaald';
    case 'premium_revoked':
      return 'Premium niet actief (betaling)';
    case 'tryout_modeshow_interested':
      return 'Try-out modeshow — geïnteresseerd';
    case 'tryout_modeshow_declined':
      return 'Try-out modeshow — niet geïnteresseerd';
    case 'tryout_modeshow_terms_accepted':
      return 'Try-out modeshow — voorwaarden geaccepteerd';
    case 'tryout_modeshow_paid':
      return 'Try-out modeshow — ingeschreven (betaald)';
    default:
      return k.replace(/_/g, ' ');
  }
}

export function historySubtitle(action: string, meta: unknown): string {
  const m = meta && typeof meta === 'object' && !Array.isArray(meta) ? (meta as Record<string, unknown>) : {};
  const k = historyKind(action);
  if (k.startsWith('agenda_')) {
    const title = String(m.calendarTitle ?? m.title ?? '');
    const d = String(m.slotDate ?? '');
    const st = String(m.startTime ?? '');
    const en = String(m.endTime ?? '');
    const t = st && en ? `${st} – ${en}` : st;
    return [title, d, t].filter(Boolean).join(' · ');
  }
  if (k === 'portfolio_download_ack') {
    return String(m.originalName ?? m.assetId ?? '');
  }
  if (k === 'portfolio_photo_uploaded') {
    return String(m.originalName ?? '');
  }
  if (k === 'portfolio_shoot_zip_downloaded') {
    return typeof m.fileCount === 'number' ? `${m.fileCount} bestand(en)` : '';
  }
  if (k === 'profile_updated') {
    const velden = m.velden;
    return Array.isArray(velden) ? velden.join(', ') : '';
  }
  if (
    k === 'brief_interest_submitted' ||
    k === 'brief_interest_withdrawn' ||
    k === 'brief_selection_accepted' ||
    k === 'brief_selection_declined'
  ) {
    return String(m.briefTitle ?? '');
  }
  if (k === 'message_mailto' || k === 'message_sent') {
    const s = String(m.subject ?? '');
    const n = m.bodyChars != null ? ` (${String(m.bodyChars)} tekens)` : '';
    return s ? `${s}${n}` : `E-mail${n}`;
  }
  if (k === 'premium_paid' || k === 'premium_revoked') {
    return String(m.premiumUntil ?? m.status ?? m.paymentId ?? '');
  }
  if (k.startsWith('tryout_modeshow_')) {
    return String(m.editionSlug ?? m.paymentId ?? '');
  }
  return '';
}

export function isModelPortalHistoryAction(action: string): boolean {
  return action.startsWith('portal.model.history.');
}
