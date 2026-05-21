import './env.bootstrap';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { urlencoded } from 'express';
import { AppModule } from './app.module';
import { logResolvedMediaRoot, resolveMediaRoot } from './config/resolve-media-root';

async function bootstrap() {
  const mediaRoot = resolveMediaRoot();
  try {
    if (!existsSync(mediaRoot)) mkdirSync(mediaRoot, { recursive: true });
  } catch (e) {
    console.warn(
      `[bootstrap] Kan mediamap niet aanmaken: ${mediaRoot}`,
      e instanceof Error ? e.message : e,
    );
  }
  logResolvedMediaRoot();
  const uploadDir = join(resolveMediaRoot(), 'agenda');
  try {
    mkdirSync(uploadDir, { recursive: true });
  } catch (e) {
    console.warn(
      `[bootstrap] Kan map niet aanmaken (sommige hosts: read-only): ${uploadDir}`,
      e instanceof Error ? e.message : e,
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(resolveMediaRoot(), { prefix: '/uploads/' });
  app.use(urlencoded({ extended: true, limit: '2mb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      /** `true` geeft vaker 500/“Internal server error” bij multipart, proxies of extra form-keys. */
      forbidNonWhitelisted: false,
    }),
  );
  const origin = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) ?? [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  app.enableCors({ origin, credentials: true });
  const port = parseInt(process.env.API_PORT ?? '4000', 10);
  const server = await app.listen(port, process.env.API_HOST ?? '0.0.0.0');
  /** Grote ZIP-uploads (uren): geen socket-timeout op Nest. */
  const uploadMs = parseInt(process.env.API_UPLOAD_TIMEOUT_MS || '21600000', 10);
  if (Number.isFinite(uploadMs) && uploadMs > 0) {
    server.requestTimeout = uploadMs;
    server.headersTimeout = uploadMs + 120_000;
  } else {
    server.requestTimeout = 0;
    server.headersTimeout = 0;
  }
  server.keepAliveTimeout = 120_000;
  console.log(`API http://localhost:${port} (upload timeout ${server.requestTimeout || 'uit'})`);
}

bootstrap().catch((err) => {
  console.error('[bootstrap] Nest start mislukt:', err);
  process.exit(1);
});
