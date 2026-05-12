import type { NextConfig } from 'next';
import path from 'path';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';

/** Monorepo root (vanuit `apps/web` tijdens build). */
const tracingRoot = path.resolve(process.cwd(), '../..');

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cm/shared'],
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  /** Altijd zetten: anders pakt Next soms een verkeerde lockfile (bv. in ~) en klopt `/_next/static/...` niet → geen CSS in dev. */
  outputFileTracingRoot: tracingRoot,
  ...(isProd ? { output: 'standalone' as const } : {}),
};

export default nextConfig;
