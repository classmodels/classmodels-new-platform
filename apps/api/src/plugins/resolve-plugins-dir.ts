import { existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

export function resolvePluginsDir(): string {
  const custom = process.env.CM_PLUGINS_DIR?.trim();
  const dir = custom ? resolve(custom) : join(process.cwd(), 'uploads', 'plugins');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}
