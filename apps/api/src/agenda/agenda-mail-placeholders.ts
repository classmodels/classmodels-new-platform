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
};

function buildMapsRouteBlockHtml(ctx: AgendaMailPlaceholderContext): string {
  const office = (ctx.officeAddress ?? '').trim();
  if (!office) return '';
  const esc = (s: string) => escHtml(s);
  const dist = (ctx.distanceLabel ?? '').trim();
  const mapsDir = (ctx.mapsDirectionsUrl ?? '').trim();
  const mapUrl = (ctx.staticMapImageUrl ?? '').trim();

  const distBlock = dist
    ? `<p style="margin:8px 0 0;font-size:14px;color:#52525b;">Afstand: <strong>${esc(dist)}</strong></p>`
    : '';
  const mapBlock = mapUrl
    ? `<p style="margin:14px 0 0;text-align:center;"><a href="${esc(mapsDir || '#')}" style="text-decoration:none;"><img src="${esc(mapUrl)}" alt="Route naar Class-Models" width="520" style="display:block;max-width:100%;height:auto;margin:0 auto;border:0;border-radius:6px;border:1px solid #e4e4e7;" /></a></p>`
    : '';
  const linkBlock = mapsDir
    ? `<p style="margin:10px 0 0;font-size:14px;text-align:center;"><a href="${esc(mapsDir)}" style="color:#6f121b;font-weight:600;">Open route in Google Maps</a></p>`
    : '';

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid #e4e4e7;border-radius:6px;margin:16px 0;background:#fafafa;"><tr><td style="padding:14px 16px;"><p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#71717a;">Kantoor</p><p style="margin:6px 0 0;font-weight:600;font-size:15px;color:#18181b;">${esc(office)}</p>${distBlock}${mapBlock}${linkBlock}</td></tr></table>`;
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

  if (mode === 'plain') {
    return {
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
      maps_route_block_html: office
        ? buildMapsRouteBlockHtml(ctx).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        : '',
    };
  }
  const esc = (s: string) => escHtml(s);
  const cancelU = esc(ctx.cancelUrl);
  const confirmU = esc(ctx.confirmUrl);
  return {
    client_name: esc(ctx.displayName || 'klant'),
    calendar_title: esc(ctx.calendarTitle),
    appointment_date: esc(ctx.dateLabel),
    appointment_time: esc(ctx.timeLabel),
    cancel_url: cancelU,
    confirm_url: confirmU,
    cancel_link_html: `<a href="${cancelU}">Afspraak annuleren</a>`,
    confirm_link_html: `<a href="${confirmU}">Ik bevestig mijn komst</a>`,
    cancel_button_html: `<table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border-radius:6px;background:#6f121b;"><a href="${cancelU}" style="display:inline-block;padding:12px 22px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">Afspraak annuleren</a></td></tr></table>`,
    confirm_button_html: `<table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:20px;"><tr><td style="border-radius:6px;background:#0f766e;"><a href="${confirmU}" style="display:inline-block;padding:12px 22px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">Ik bevestig mijn komst</a></td></tr></table>`,
    office_address: esc(office),
    distance_label: esc(dist),
    maps_directions_url: esc(mapsDir),
    maps_directions_link_html: mapsDir
      ? `<a href="${esc(mapsDir)}">Route naar ons kantoor in Google Maps</a>`
      : '',
    maps_route_block_html: office ? buildMapsRouteBlockHtml(ctx) : '',
  };
}

export function coerceOutgoingEmailHtml(inner: string): string {
  const t = inner.trim();
  if (!t) {
    return '<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"/></head><body></body></html>';
  }
  if (/^<!DOCTYPE/i.test(t) || /^<html/i.test(t)) return t;
  if (!t.includes('<')) {
    const body = escHtml(t).replace(/\r\n/g, '\n').replace(/\n/g, '<br/>\n');
    return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;"><tr><td align="center"><div style="max-width:560px;text-align:left;background:#ffffff;border-radius:8px;padding:24px;border:1px solid #e4e4e7;color:#18181b;font-size:15px;line-height:1.55;">${body}</div></td></tr></table></body></html>`;
  }
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;"><tr><td align="center">${t}</td></tr></table></body></html>`;
}
