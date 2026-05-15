'use strict';
/**
 * Logt alleen naar stderr (zichtbaar in build/serve-log), geen secrets.
 */
function warnDbUrlIfSuspicious() {
  const u = String(process.env.DB_URL || process.env.DATABASE_URL || '').trim();
  if (!u) {
    console.error('[combell] DB_URL ontbreekt — Nest kan niet opstarten. Zet DB_URL in Combell environment variables.');
    return;
  }
  const m = u.match(/\/([^/?]+)(\?|#|$)/);
  const dbName = m ? m[1] : '';
  if (dbName && /^ID\d+_$/.test(dbName)) {
    console.error(
      '[combell] DB_URL databasenaam lijkt ONVOLLEDIG (eindigt op "_" zonder naam). Kopieer in Combell Databases de volledige databasenaam achter de laatste /.',
    );
  }
  console.error('[combell] DB_URL is gezet (lengte ' + u.length + ' tekens).');
}

module.exports = { warnDbUrlIfSuspicious };
