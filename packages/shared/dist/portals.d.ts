export declare const PORTALS: readonly ["guest", "model", "client"];
export type Portal = (typeof PORTALS)[number];
export declare function isPortal(v: string): v is Portal;
