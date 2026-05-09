import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { dirname, join } from 'path';

/** Zorgt dat `process.env` gevuld is vóór andere modules `JwtModule.register` e.d. evalueren. */
function loadEnvFromAncestors() {
  let dir = process.cwd();
  for (let i = 0; i < 12; i++) {
    const candidate = join(dir, '.env');
    if (existsSync(candidate)) {
      loadEnv({ path: candidate });
      return;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}

loadEnvFromAncestors();
