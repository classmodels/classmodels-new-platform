/** Breedte inhoud (zoals huisstijl-mail). */
export declare const CM_EMAIL_CONTENT_WIDTH = 680;
/** Verwijdert centrering uit editor-/TinyMCE-HTML. */
export declare function normalizeEmailContentAlignment(html: string): string;
/** Haalt inhoud uit volledige HTML-documenten (herbruik wrapper). */
export declare function extractEmailBodyContent(html: string): string;
export type BuildClassModelsEmailOptions = {
    /** Nieuwsbrief: toon uitschrijflink. */
    includeUnsubscribe?: boolean;
    /** Concrete uitschrijflink (vervangt {{uitschrijflink}}). */
    unsubscribeUrl?: string;
    title?: string;
};
/** Volledige HTML-mail: huisstijl-header + body + footer. */
export declare function buildClassModelsEmailDocument(bodyHtml: string, opts?: BuildClassModelsEmailOptions): string;
/** Wrapt fragment, platte tekst of bestaand HTML-document in het Class-Models-mailtemplate. */
export declare function coerceOutgoingEmailHtml(inner: string, opts?: BuildClassModelsEmailOptions): string;
