import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Geen `$connect` in `onModuleInit`: zo start de API ook als MySQL (nog) niet draait.
 * Prisma verbindt bij de eerste query; start daarna `docker compose up -d` en herlaad clients.
 *
 * Wel: ontbrekende testshoot-feedbackkolommen toevoegen (live 500 na deploy zonder migrate).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.ensureTestshootFeedbackSchema();
    } catch (e) {
      this.log.warn(
        `TestshootFeedback schema-ensure overgeslagen: ${e instanceof Error ? e.message : e}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /** Idempotent: archived + modelName + nullable modelId (ON DELETE SET NULL). */
  private async ensureTestshootFeedbackSchema() {
    const colRows = await this.$queryRawUnsafe<Array<{ name: string; nullable: string }>>(
      `SELECT COLUMN_NAME AS name, IS_NULLABLE AS nullable
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TestshootFeedback'`,
    );
    if (!colRows.length) return;

    const byName = new Map(colRows.map((r) => [String(r.name), r]));

    if (!byName.has('archived')) {
      await this.$executeRawUnsafe(
        'ALTER TABLE `TestshootFeedback` ADD COLUMN `archived` BOOLEAN NOT NULL DEFAULT false',
      );
      this.log.log('TestshootFeedback.archived toegevoegd');
    }
    if (!byName.has('modelName')) {
      await this.$executeRawUnsafe(
        'ALTER TABLE `TestshootFeedback` ADD COLUMN `modelName` VARCHAR(191) NULL',
      );
      this.log.log('TestshootFeedback.modelName toegevoegd');
    }

    const modelId = byName.get('modelId');
    if (modelId && String(modelId.nullable).toUpperCase() === 'NO') {
      const fks = await this.$queryRawUnsafe<Array<{ name: string }>>(
        `SELECT CONSTRAINT_NAME AS name
         FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TestshootFeedback'
           AND COLUMN_NAME = 'modelId' AND REFERENCED_TABLE_NAME IS NOT NULL`,
      );
      for (const fk of fks) {
        await this.$executeRawUnsafe(
          `ALTER TABLE \`TestshootFeedback\` DROP FOREIGN KEY \`${String(fk.name)}\``,
        );
      }
      await this.$executeRawUnsafe(
        'ALTER TABLE `TestshootFeedback` MODIFY `modelId` VARCHAR(191) NULL',
      );
      await this.$executeRawUnsafe(
        'ALTER TABLE `TestshootFeedback` ADD CONSTRAINT `TestshootFeedback_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `TestshootModel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
      );
      this.log.log('TestshootFeedback.modelId → nullable + SET NULL');
    }

    await this.$executeRawUnsafe(
      `UPDATE \`TestshootFeedback\` f
       LEFT JOIN \`TestshootModel\` m ON m.\`id\` = f.\`modelId\`
       SET f.\`modelName\` = m.\`name\`
       WHERE f.\`modelName\` IS NULL AND m.\`name\` IS NOT NULL`,
    );
  }
}
