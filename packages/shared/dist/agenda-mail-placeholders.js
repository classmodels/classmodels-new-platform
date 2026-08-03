"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coerceOutgoingEmailHtml = void 0;
exports.applyAgendaMailPlaceholders = applyAgendaMailPlaceholders;
exports.buildAgendaMailPlaceholderVars = buildAgendaMailPlaceholderVars;
exports.buildAgendaMailPreviewDemoVars = buildAgendaMailPreviewDemoVars;
exports.buildAgendaMailPreviewDemoVarsPlain = buildAgendaMailPreviewDemoVarsPlain;
function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
/** Vervangt `{{key}}` en daarna `{key}` (langere sleutels eerst bij enkele accolades). */
function applyAgendaMailPlaceholders(template, vars) {
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
function buildAgendaMailPlaceholderVars(ctx, mode) {
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
        };
    }
    const esc = (s) => escHtml(s);
    const cancelU = esc(ctx.cancelUrl);
    const confirmU = esc(ctx.confirmUrl);
    return {
        cancel_reason: esc(cancelReason),
        cancel_reason_block_html: cancelReason
            ? `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid #fecaca;border-radius:6px;margin:16px 0;background:#fef2f2;"><tr><td style="padding:12px 16px;"><p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#991b1b;">Reden van annulatie</p><p style="margin:6px 0 0;font-size:14px;color:#18181b;white-space:pre-wrap;">${esc(cancelReason)}</p></td></tr></table>`
            : '',
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
        cancelUrl: 'https://www.class-models.be/gasten/annuleer?token=demo-token',
        confirmUrl: 'https://www.class-models.be/gasten/bevestig?token=demo-token',
    }, 'html');
}
/** Vaste demowaarden voor SMS-voorbeeld (platte URL’s). */
function buildAgendaMailPreviewDemoVarsPlain() {
    return buildAgendaMailPlaceholderVars({
        displayName: 'Jan Janssens',
        calendarTitle: 'Portfolio afspraak',
        dateLabel: 'dinsdag 13 mei 2026',
        timeLabel: '10:00 – 10:30',
        cancelUrl: 'https://www.class-models.be/gasten/annuleer?token=demo-token',
        confirmUrl: 'https://www.class-models.be/gasten/bevestig?token=demo-token',
    }, 'plain');
}
var email_layout_1 = require("./email-layout");
Object.defineProperty(exports, "coerceOutgoingEmailHtml", { enumerable: true, get: function () { return email_layout_1.coerceOutgoingEmailHtml; } });
