/**
 * Knoppen in de rode titelbalk — zelfde afmetingen en kleuren als tab «Opdrachten».
 */
export function portalTitlebarPillClass(active: boolean): string {
  const base = 'rounded-full border px-2.5 py-1 text-[11px] font-medium transition';
  return active
    ? `${base} border-white bg-white text-zinc-900 shadow-sm`
    : `${base} border-white/40 bg-white/10 text-white hover:bg-white/20`;
}
