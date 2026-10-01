/**
 * Agenda-mail placeholders (server).
 * **Houd gelijk met** `packages/shared/src/agenda-mail-placeholders.ts` — API importeert dit lokaal
 * zodat productie niet afhangt van `node_modules/@cm/shared` (Combell symlink / incomplete deploy).
 */
export type AgendaMailPlaceholderContext = {
  displayName: string;
  calendarTitle: string;
  dateLabel: string;
  timeLabel: string;
  cancelUrl: string;
  confirmUrl: string;
  officeAddress?: string;
  distanceLabel?: string;
  mapsDirectionsUrl?: string;
  staticMapImageUrl?: string;
  /** Platte tekst: "Datum: van … naar …" (admin-wijziging). */
  changeSummaryPlain?: string;
  /** HTML-blok met wijzigingstabel (admin-wijziging). */
  changeSummaryHtml?: string;
  /** Reden van annulatie (meegestuurd in annulatiemail). */
  cancelReason?: string;
};

/** HTML-blok met de annulatiereden (leeg zonder reden). */
export function buildCancelReasonBlockHtml(reason: string | null | undefined): string {
  const r = (reason ?? '').trim();
  if (!r) return '';
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid #c2a164;margin:16px 0;background:#ffffff;"><tr><td style="padding:12px 16px;"><p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#856b3f;">Reden van annulatie</p><p style="margin:6px 0 0;font-size:14px;color:#191919;white-space:pre-wrap;">${escHtml(r)}</p></td></tr></table>`;
}

function buildMapsRouteBlockHtml(ctx: AgendaMailPlaceholderContext): string {
  const office = (ctx.officeAddress ?? '').trim();
  if (!office) return '';
  const esc = (s: string) => escHtml(s);
  const dist = (ctx.distanceLabel ?? '').trim();
  const mapsDir = (ctx.mapsDirectionsUrl ?? '').trim();
  const mapUrl = (ctx.staticMapImageUrl ?? '').trim();

  const distBlock = dist
    ? `<p style="margin:8px 0 0;font-size:14px;color:#525049;">Afstand: <strong>${esc(dist)}</strong></p>`
    : '';
  const mapBlock = mapUrl
    ? `<p style="margin:14px 0 0;text-align:left;"><a href="${esc(mapsDir || '#')}" style="text-decoration:none;"><img src="${esc(mapUrl)}" alt="Route naar Class-Models" width="520" style="display:block;max-width:100%;height:auto;border:0;border:1px solid #c2a164;" /></a></p>`
    : '';
  const linkBlock = mapsDir
    ? `<p style="margin:10px 0 0;font-size:14px;text-align:left;"><a href="${esc(mapsDir)}" style="color:#856b3f;font-weight:700;">Open route in Google Maps</a></p>`
    : '';

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid #c2a164;margin:16px 0;background:#ffffff;"><tr><td style="padding:14px 16px;"><p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#856b3f;">Kantoor</p><p style="margin:6px 0 0;font-weight:600;font-size:15px;color:#191919;">${esc(office)}</p>${distBlock}${mapBlock}${linkBlock}</td></tr></table>`;
}

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Vervangt `{{key}}` en daarna `{key}` (langere sleutels eerst bij enkele accolades). */
export function applyAgendaMailPlaceholders(
  template: string | null | undefined,
  vars: Record<string, string>,
): string {
  let out = typeof template === 'string' ? template : String(template ?? '');
  const entries = Object.entries(vars).sort((a, b) => b[0].length - a[0].length);
  for (const [k, v] of entries) {
    const safe = v ?? '';
    out = out.split(`{{${k}}}`).join(safe);
  }
  for (const [k, v] of entries) {
    const safe = v ?? '';
    out = out.split(`{${k}}`).join(safe);
  }
  return out;
}

export function buildAgendaMailPlaceholderVars(
  ctx: AgendaMailPlaceholderContext,
  mode: 'html' | 'plain',
): Record<string, string> {
  const office = ctx.officeAddress ?? '';
  const dist = ctx.distanceLabel ?? '';
  const mapsDir = ctx.mapsDirectionsUrl ?? '';
  const changesPlain = ctx.changeSummaryPlain ?? '';
  const changesHtml = ctx.changeSummaryHtml ?? '';
  const cancelReason = (ctx.cancelReason ?? '').trim();

  if (mode === 'plain') {
    return {
      cancel_reason: cancelReason,
      cancel_reason_block_html: cancelReason ? `Reden van annulatie: ${cancelReason}` : '',
      client_name: ctx.displayName || 'klant',
      calendar_title: ctx.calendarTitle,
      appointment_date: ctx.dateLabel,
      appointment_time: ctx.timeLabel,
      cancel_url: ctx.cancelUrl,
      confirm_url: ctx.confirmUrl,
      cancel_link_html: ctx.cancelUrl,
      confirm_link_html: ctx.confirmUrl,
      cancel_button_html: '',
      confirm_button_html: '',
      office_address: office,
      distance_label: dist,
      maps_directions_url: mapsDir,
      changes_summary: changesPlain,
      changes_block_html: changesPlain,
      maps_route_block_html: office
        ? buildMapsRouteBlockHtml(ctx).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        : '',
    };
  }
  const esc = (s: string) => escHtml(s);
  const cancelU = esc(ctx.cancelUrl);
  const confirmU = esc(ctx.confirmUrl);
  return {
    cancel_reason: esc(cancelReason),
    cancel_reason_block_html: buildCancelReasonBlockHtml(cancelReason),
    client_name: esc(ctx.displayName || 'klant'),
    calendar_title: esc(ctx.calendarTitle),
    appointment_date: esc(ctx.dateLabel),
    appointment_time: esc(ctx.timeLabel),
    cancel_url: cancelU,
    confirm_url: confirmU,
    cancel_link_html: `<a href="${cancelU}" style="color:#191919;">Afspraak annuleren</a>`,
    confirm_link_html: `<a href="${confirmU}" style="color:#856b3f;">Ik bevestig mijn komst</a>`,
    cancel_button_html: `<table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border:1px solid #191919;background:#191919;"><a href="${cancelU}" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;font-family:Arial,Helvetica,sans-serif;white-space:nowrap;">Afspraak annuleren</a></td></tr></table>`,
    confirm_button_html: `<table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border:1px solid #c2a164;background:#c2a164;"><a href="${confirmU}" style="display:inline-block;padding:12px 18px;color:#191919;text-decoration:none;font-weight:700;font-size:14px;font-family:Arial,Helvetica,sans-serif;white-space:nowrap;">Ik bevestig mijn komst</a></td></tr></table>`,
    office_address: esc(office),
    distance_label: esc(dist),
    maps_directions_url: esc(mapsDir),
    maps_directions_link_html: mapsDir
      ? `<a href="${esc(mapsDir)}">Route naar ons kantoor in Google Maps</a>`
      : '',
    changes_summary: esc(changesPlain),
    changes_block_html: changesHtml || (changesPlain ? `<p style="margin:0 0 16px;text-align:left;">${esc(changesPlain)}</p>` : ''),
    maps_route_block_html: office ? buildMapsRouteBlockHtml(ctx) : '',
  };
}

export { coerceOutgoingEmailHtml } from '../mail/email-layout';
