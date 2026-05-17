"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyAgendaMailPlaceholders = applyAgendaMailPlaceholders;
exports.buildAgendaMailPlaceholderVars = buildAgendaMailPlaceholderVars;
exports.buildAgendaMailPreviewDemoVars = buildAgendaMailPreviewDemoVars;
exports.buildAgendaMailPreviewDemoVarsPlain = buildAgendaMailPreviewDemoVarsPlain;
exports.coerceOutgoingEmailHtml = coerceOutgoingEmailHtml;
function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
/** Vervangt `{{key}}` en daarna `{key}` (langere sleutels eerst bij enkele accolades). */
function applyAgendaMailPlaceholders(template, vars) {
    let out = template;
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
function buildAgendaMailPlaceholderVars(ctx, mode) {
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
        };
    }
    const esc = (s) => escHtml(s);
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
    };
}
/** Vaste demowaarden voor admin-voorbeeld (zelfde stijl als echte mail). */
function buildAgendaMailPreviewDemoVars() {
    return buildAgendaMailPlaceholderVars({
        displayName: 'Jan Janssens',
        calendarTitle: 'Portfolio afspraak',
        dateLabel: 'dinsdag 13 mei 2026',
        timeLabel: '10:00 – 10:30',
        cancelUrl: 'https://www.class-models.be/portal/guest/annuleer?token=demo-token',
        confirmUrl: 'https://www.class-models.be/portal/guest/bevestig?token=demo-token',
    }, 'html');
}
/** Vaste demowaarden voor SMS-voorbeeld (platte URL’s). */
function buildAgendaMailPreviewDemoVarsPlain() {
    return buildAgendaMailPlaceholderVars({
        displayName: 'Jan Janssens',
        calendarTitle: 'Portfolio afspraak',
        dateLabel: 'dinsdag 13 mei 2026',
        timeLabel: '10:00 – 10:30',
        cancelUrl: 'https://www.class-models.be/portal/guest/annuleer?token=demo-token',
        confirmUrl: 'https://www.class-models.be/portal/guest/bevestig?token=demo-token',
    }, 'plain');
}
/**
 * Zelfde als API: platte tekst of fragment in een nette HTML-mail zetten.
 */
function coerceOutgoingEmailHtml(inner) {
    const t = inner.trim();
    if (!t) {
        return '<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"/></head><body></body></html>';
    }
    if (/^<!DOCTYPE/i.test(t) || /^<html/i.test(t))
        return t;
    if (!t.includes('<')) {
        const body = escHtml(t).replace(/\r\n/g, '\n').replace(/\n/g, '<br/>\n');
        return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;"><tr><td align="center"><div style="max-width:560px;text-align:left;background:#ffffff;border-radius:8px;padding:24px;border:1px solid #e4e4e7;color:#18181b;font-size:15px;line-height:1.55;">${body}</div></td></tr></table></body></html>`;
    }
    return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;"><tr><td align="center">${t}</td></tr></table></body></html>`;
}
