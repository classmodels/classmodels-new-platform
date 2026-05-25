'use strict';

/**
 * Dual-proxy (Next + Nest op één Combell-poort).
 * Geneste workers (Nest/Next child) zetten COMBELL_NEST_WORKER / COMBELL_WEB_WORKER.
 *
 * **Combell:** `COMBELL_HOST_ROUTER=1` of variabele weglaten. Niet `0` of `.`.
 */
function isCombellContainer() {
  const home = String(process.env.HOME ?? '').replace(/\/+$/, '');
  return home === '/app' || home.endsWith('/app');
}

function combellHostRouterEnabled() {
  /** Geneste processen: nooit opnieuw dual-proxy starten. */
  if (process.env.COMBELL_NEST_WORKER === '1' || process.env.COMBELL_WEB_WORKER === '1') {
    return false;
  }

  /**
   * Combell Node-container: altijd dual-proxy (Next + Nest).
   * `COMBELL_HOST_ROUTER=0` in het paneel blokkeerde uploads — die waarde negeren we hier.
   */
  if (process.env.NODE_ENV === 'production' && isCombellContainer()) {
    const raw = String(process.env.COMBELL_HOST_ROUTER ?? '').trim();
    const v = raw.toLowerCase();
    if (v && v !== '1' && v !== 'true' && v !== 'yes' && v !== 'on') {
      console.error(
        `[combell] COMBELL_HOST_ROUTER=${JSON.stringify(raw)} wordt GENEGEERD in de container — dual-proxy is verplicht. ` +
          'Verwijder de variabele of zet COMBELL_HOST_ROUTER=1 (niet 0, niet ".").',
      );
    }
    return true;
  }

  const raw = String(process.env.COMBELL_HOST_ROUTER ?? '').trim();
  const v = raw.toLowerCase();
  if (!v || v === '0' || v === 'false' || v === 'off' || v === 'no') return false;
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;

  console.error(
    `[combell] COMBELL_HOST_ROUTER=${JSON.stringify(raw)} is ongeldig — dual-proxy UIT. Zet COMBELL_HOST_ROUTER=1.`,
  );
  return false;
}

module.exports = { combellHostRouterEnabled, isCombellContainer };
