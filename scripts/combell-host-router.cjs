'use strict';

/**
 * Wanneer de dual-proxy aan staat (Combell env).
 * Geneste workers zetten COMBELL_HOST_ROUTER=0 → altijd uit.
 */
function combellHostRouterEnabled() {
  const v = String(process.env.COMBELL_HOST_ROUTER || '').trim().toLowerCase();
  if (!v || v === '0' || v === 'false' || v === 'off' || v === 'no') return false;
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

module.exports = { combellHostRouterEnabled };
