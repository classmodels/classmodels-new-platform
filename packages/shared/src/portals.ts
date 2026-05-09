export const PORTALS = ['guest', 'model', 'client'] as const;
export type Portal = (typeof PORTALS)[number];

export function isPortal(v: string): v is Portal {
  return (PORTALS as readonly string[]).includes(v);
}
