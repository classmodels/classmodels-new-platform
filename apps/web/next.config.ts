import type { NextConfig } from 'next';
import path from 'path';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';

/** Monorepo root (vanuit `apps/web` tijdens build). */
const tracingRoot = path.resolve(process.cwd(), '../..');

const isProd = process.env.NODE_ENV === 'production';

/** Combell: Nest op dezelfde machine als Next (dual-proxy). Zet bij build indien nodig. */
const apiInternal =
  process.env.CM_API_INTERNAL_URL?.replace(/\/$/, '') || 'http://127.0.0.1:4000';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cm/shared'],
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  /** Altijd zetten: anders pakt Next soms een verkeerde lockfile (bv. in ~) en klopt `/_next/static/...` niet → geen CSS in dev. */
  outputFileTracingRoot: tracingRoot,
  ...(isProd ? { output: 'standalone' as const } : {}),
  /** Ook in dev: `/__cm_api` → Nest (zelfde als productie), zodat media/video URLs werken. */
  async rewrites() {
    return [{ source: '/__cm_api/:path*', destination: `${apiInternal}/:path*` }];
  },
  /** Klassieke begin/lobby-routes → nieuwe site. Oude mail/Mollie-links blijven werken via redirect. */
  async redirects() {
    return [
      { source: '/lobby', destination: '/nieuw/inloggen', permanent: false },
      { source: '/lobby/:path*', destination: '/nieuw/inloggen', permanent: false },
      { source: '/home', destination: '/nieuw', permanent: false },
      { source: '/modellen', destination: '/nieuw/modellen', permanent: false },
      { source: '/gratis-fotoshoot', destination: '/nieuw/gasten/gratis-fotoshoot', permanent: false },
      { source: '/reviews', destination: '/nieuw/reviews', permanent: false },
      { source: '/portal/guest/annuleer', destination: '/nieuw/gasten/annuleer', permanent: false },
      { source: '/portal/guest/bevestig', destination: '/nieuw/gasten/bevestig', permanent: false },
      {
        source: '/portal/model/betaling/bedankt',
        destination: '/nieuw/modellen/betaling/bedankt',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
