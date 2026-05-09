import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Geen `$connect` in `onModuleInit`: zo start de API ook als Postgres (nog) niet draait.
 * Prisma verbindt bij de eerste query; start daarna `docker compose up -d` en herlaad clients.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
