'use strict';

/**
 * Dual-proxy (Next + Nest op één Combell-poort).
 * Geneste workers zetten COMBELL_HOST_ROUTER=0 → altijd uit.
 *
 * **Combell:** zet exact `COMBELL_HOST_ROUTER=1`. Waarden zoals `.` of `2` zijn ongeldig.
 */
function combellHostRouterEnabled() {
  const raw = String(process.env.COMBELL_HOST_ROUTER ?? '').trim();
  const v = raw.toLowerCase();
  if (!v || v === '0' || v === 'false' || v === 'off' || v === 'no') return false;
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;

  /** Productie-container: foutieve waarde (bv. ".") → dual-proxy toch aan, anders geen API/uploads. */
  const home = String(process.env.HOME ?? '').replace(/\/+$/, '');
  const inContainer = home === '/app' || home.endsWith('/app');
  if (process.env.NODE_ENV === 'production' && inContainer) {
    console.error(
      `[combell] COMBELL_HOST_ROUTER=${JSON.stringify(raw)} is ONGELDIG — dual-proxy wordt WEL gestart. ` +
        'Zet in Combell Environment variables exact: COMBELL_HOST_ROUTER=1 (cijfer één, geen punt).',
    );
    return true;
  }

  console.error(
    `[combell] COMBELL_HOST_ROUTER=${JSON.stringify(raw)} is ongeldig — dual-proxy UIT. ` +
      'Alleen Next draait dan; uploads en /__cm_api falen. Zet COMBELL_HOST_ROUTER=1.',
  );
  return false;
}

module.exports = { combellHostRouterEnabled };
