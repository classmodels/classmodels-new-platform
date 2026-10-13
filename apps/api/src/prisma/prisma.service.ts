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

  private agendaSchemaReady: Promise<void> | null = null;

  async onModuleInit() {
    try {
      await this.ensureTestshootFeedbackSchema();
    } catch (e) {
      this.log.warn(
        `TestshootFeedback schema-ensure overgeslagen: ${e instanceof Error ? e.message : e}`,
      );
    }
    try {
      await this.ensureAgendaAvailabilityColumns();
    } catch (e) {
      this.log.warn(
        `Agenda schema-ensure overgeslagen: ${e instanceof Error ? e.message : e}`,
      );
    }
  }

  /**
   * Idempotent: kolommen voor volgeboekt en bezette uren.
   * Een deploy zonder geslaagde migrate laat anders elke agenda-query 500-en.
   */
  ensureAgendaAvailabilityColumns(): Promise<void> {
    if (!this.agendaSchemaReady) {
      this.agendaSchemaReady = this.applyAgendaAvailabilityColumns().catch((e) => {
        this.agendaSchemaReady = null;
        throw e;
      });
    }
    return this.agendaSchemaReady;
  }

  private async applyAgendaAvailabilityColumns() {
    await this.ensureMissingColumns('AgendaOpenDay', [
      ['fullyBooked', 'BOOLEAN NOT NULL DEFAULT false'],
      ['fullyBookedTestshoot', 'BOOLEAN NOT NULL DEFAULT false'],
      ['fullyBookedIntake', 'BOOLEAN NOT NULL DEFAULT false'],
    ]);
    await this.ensureMissingColumns('AgendaCalendar', [
      ['showOccupiedHoursTestshoot', 'BOOLEAN NOT NULL DEFAULT false'],
      ['showOccupiedHoursIntake', 'BOOLEAN NOT NULL DEFAULT false'],
      ['showOccupiedHours', 'BOOLEAN NOT NULL DEFAULT false'],
      ['agendaVisible', 'BOOLEAN NOT NULL DEFAULT true'],
      ['homePublished', 'BOOLEAN NOT NULL DEFAULT false'],
      ['homeKicker', 'VARCHAR(191) NULL'],
      ['homeTitle', 'TEXT NULL'],
      ['homeLead', 'TEXT NULL'],
      ['homeBody', 'TEXT NULL'],
      ['homeHighlight', 'TEXT NULL'],
      ['homeClose', 'TEXT NULL'],
      ['homeButtonLabel', 'VARCHAR(80) NULL'],
      ['homeImageUrl', 'TEXT NULL'],
      ['waveBooking', 'BOOLEAN NOT NULL DEFAULT false'],
      ['waveSlotPlan', 'JSON NULL'],
      ['splitOpenDaysSeeded', 'BOOLEAN NOT NULL DEFAULT false'],
    ]);
    try {
      await this.$executeRawUnsafe(
        `UPDATE \`AgendaOpenDay\`
         SET \`fullyBookedTestshoot\` = true, \`fullyBookedIntake\` = true
         WHERE \`fullyBooked\` = true
           AND \`fullyBookedTestshoot\` = false
           AND \`fullyBookedIntake\` = false`,
      );
    } catch (e) {
      this.log.warn(
        `Agenda volzet-backfill overgeslagen: ${e instanceof Error ? e.message : e}`,
      );
    }
  }

  private async ensureMissingColumns(table: string, columns: Array<[string, string]>) {
    const colRows = await this.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT COLUMN_NAME AS name
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}'`,
    );
    if (!colRows.length) return;
    const have = new Set(
      colRows.map((r) => String(r.name ?? r.NAME ?? r.COLUMN_NAME ?? r.column_name ?? '')),
    );
    for (const [name, ddl] of columns) {
      if (have.has(name)) continue;
      try {
        await this.$executeRawUnsafe(`ALTER TABLE \`${table}\` ADD COLUMN \`${name}\` ${ddl}`);
        this.log.log(`${table}.${name} toegevoegd`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!/duplicate column/i.test(msg)) throw e;
      }
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
