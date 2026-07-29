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
  /**
   * Oude URLs blijven werken:
   * - /nieuw-pagina’s → root (geen catch-all: anders breken /nieuw/*.jpg|png assets)
   * - klassieke portal/lobby → huidige site
   */
  async redirects() {
    return [
      { source: '/nieuw', destination: '/', permanent: false },
      { source: '/nieuw/modellen', destination: '/modellen', permanent: false },
      { source: '/nieuw/modellen/:path*', destination: '/modellen/:path*', permanent: false },
      { source: '/nieuw/klanten', destination: '/klanten', permanent: false },
      { source: '/nieuw/klanten/:path*', destination: '/klanten/:path*', permanent: false },
      { source: '/nieuw/gasten', destination: '/gasten', permanent: false },
      { source: '/nieuw/gasten/:path*', destination: '/gasten/:path*', permanent: false },
      { source: '/nieuw/inloggen', destination: '/inloggen', permanent: false },
      { source: '/nieuw/reviews', destination: '/reviews', permanent: false },
      { source: '/lobby', destination: '/inloggen', permanent: false },
      { source: '/lobby/:path*', destination: '/inloggen', permanent: false },
      { source: '/home', destination: '/', permanent: false },
      { source: '/gratis-fotoshoot', destination: '/gasten/gratis-fotoshoot', permanent: false },
      { source: '/portal/guest/annuleer', destination: '/gasten/annuleer', permanent: false },
      { source: '/portal/guest/bevestig', destination: '/gasten/bevestig', permanent: false },
      {
        source: '/portal/model/betaling/bedankt',
        destination: '/modellen/betaling/bedankt',
        permanent: false,
      },
      { source: '/portal/guest', destination: '/', permanent: false },
      { source: '/portal/guest/:path*', destination: '/', permanent: false },
      { source: '/portal/client', destination: '/klanten', permanent: false },
      { source: '/portal/client/:path*', destination: '/klanten', permanent: false },
      { source: '/portal/model/showroom', destination: '/modellen?tab=modellen', permanent: false },
      { source: '/portal/model/gallery-3d', destination: '/modellen?tab=modellen', permanent: false },
      { source: '/portal/model/modellenwand', destination: '/modellen?tab=modellen', permanent: false },
      { source: '/portal/model/fiche-preview', destination: '/modellen?tab=modellen', permanent: false },
      { source: '/portal/model', destination: '/modellen', permanent: false },
      { source: '/portal/model/:path*', destination: '/modellen', permanent: false },
      { source: '/portal', destination: '/', permanent: false },
      { source: '/portal/:path*', destination: '/', permanent: false },
    ];
  },
};

export default nextConfig;
