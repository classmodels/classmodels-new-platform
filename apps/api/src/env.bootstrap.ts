import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { dirname, join } from 'path';

/**
 * Laadt `.env` zodat `process.env` klaarstaat vóór JwtModule e.d.
 *
 * Monorepo: `npm run dev` draait meestal met `cwd` = repo-root. Daar bestaat een `.env`
 * zonder VAPID, terwijl de echte API-secrets in `apps/api/.env` staan. We laden daarom
 * bij voorkeur **beide**: eerst root, daarna `apps/api/.env` met override.
 */
function loadEnvFromAncestors() {
  let dir = process.cwd();
  for (let i = 0; i < 12; i++) {
    const rootEnv = join(dir, '.env');
    const apiEnv = join(dir, 'apps', 'api', '.env');

    if (existsSync(apiEnv)) {
      if (existsSync(rootEnv) && rootEnv !== apiEnv) {
        loadEnv({ path: rootEnv });
      }
      loadEnv({ path: apiEnv, override: true });
      return;
    }
    if (existsSync(rootEnv)) {
      loadEnv({ path: rootEnv });
      return;
    }

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}

loadEnvFromAncestors();

/** Combell: sommige panels weigeren lange keys; Prisma leest `DB_URL`. Oude `DATABASE_URL` blijft werken. */
const dbUrl = process.env.DB_URL?.trim() || process.env.DATABASE_URL?.trim();
if (dbUrl) {
  process.env.DB_URL = dbUrl;
  if (!process.env.DATABASE_URL?.trim()) process.env.DATABASE_URL = dbUrl;
}
