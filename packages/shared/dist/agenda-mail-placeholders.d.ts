export type AgendaMailPlaceholderContext = {
    displayName: string;
    calendarTitle: string;
    dateLabel: string;
    timeLabel: string;
    cancelUrl: string;
    confirmUrl: string;
};
/** Vervangt `{{key}}` en daarna `{key}` (langere sleutels eerst bij enkele accolades). */
export declare function applyAgendaMailPlaceholders(template: string | null | undefined, vars: Record<string, string>): string;
export declare function buildAgendaMailPlaceholderVars(ctx: AgendaMailPlaceholderContext, mode: 'html' | 'plain'): Record<string, string>;
/** Vaste demowaarden voor admin-voorbeeld (zelfde stijl als echte mail). */
export declare function buildAgendaMailPreviewDemoVars(): Record<string, string>;
/** Vaste demowaarden voor SMS-voorbeeld (platte URL’s). */
export declare function buildAgendaMailPreviewDemoVarsPlain(): Record<string, string>;
/**
 * Zelfde als API: platte tekst of fragment in een nette HTML-mail zetten.
 */
export declare function coerceOutgoingEmailHtml(inner: string): string;
