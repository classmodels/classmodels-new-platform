/** Breedte witte inhoud. */
export declare const CM_EMAIL_CONTENT_WIDTH = 800;
/** Verwijdert centrering uit editor-/TinyMCE-HTML. */
export declare function normalizeEmailContentAlignment(html: string): string;
/** Haalt inhoud uit volledige HTML-documenten (herbruik wrapper). */
export declare function extractEmailBodyContent(html: string): string;
/** Volledige HTML-mail met donkere goud-header + witte inhoud, links uitgelijnd. */
export declare function buildClassModelsEmailDocument(bodyHtml: string): string;
/** Wrapt fragment, platte tekst of bestaand HTML-document in het Class-Models-mailtemplate. */
export declare function coerceOutgoingEmailHtml(inner: string): string;
