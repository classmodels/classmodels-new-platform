import './env.bootstrap';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(urlencoded({ extended: true, limit: '2mb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const origin = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) ?? [
    'http://localhost:3000',
  ];
  app.enableCors({ origin, credentials: true });
  const port = parseInt(process.env.API_PORT ?? '4000', 10);
  await app.listen(port, process.env.API_HOST ?? '0.0.0.0');
  console.log(`API http://localhost:${port}`);
}

bootstrap();
