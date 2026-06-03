/** Breedte witte inhoud (zoals WordPress-mail / bijlage 2). */
export declare const CM_EMAIL_CONTENT_WIDTH = 800;
/** Verwijdert centrering uit editor-/TinyMCE-HTML. */
export declare function normalizeEmailContentAlignment(html: string): string;
/** Haalt inhoud uit volledige HTML-documenten (herbruik wrapper). */
export declare function extractEmailBodyContent(html: string): string;
/** Volledige HTML-mail met donkerblauwe balk + witte inhoud 800px, links uitgelijnd. */
export declare function buildClassModelsEmailDocument(bodyHtml: string): string;
/** Wrapt fragment, platte tekst of bestaand HTML-document in het Class-Models-mailtemplate. */
export declare function coerceOutgoingEmailHtml(inner: string): string;
