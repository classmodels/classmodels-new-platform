import type { NextConfig } from 'next';
import path from 'path';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';

/** Monorepo root (vanuit `apps/web` tijdens build). */
const tracingRoot = path.resolve(process.cwd(), '../..');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cm/shared'],
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  output: 'standalone',
  outputFileTracingRoot: tracingRoot,
};

export default nextConfig;
