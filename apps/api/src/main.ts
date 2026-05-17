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
  await app.listen(port, process.env.API_HOST ?? '0.0.0.0');
  console.log(`API http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('[bootstrap] Nest start mislukt:', err);
  process.exit(1);
});
