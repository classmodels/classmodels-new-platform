import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AgendaNotificationService } from './agenda-notifications.service';

/** Periodiek geplande agenda-herinneringen en opvolging (offset ≠ 0). */
@Injectable()
export class AgendaReminderScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(AgendaReminderScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private readonly notifications: AgendaNotificationService) {}

  onModuleInit() {
    const ms = parseInt(process.env.AGENDA_REMINDER_POLL_MS || '300000', 10) || 300000;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), ms);
    this.log.log(`Agenda-herinneringen actief (elke ${Math.round(ms / 1000)}s).`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const n = await this.notifications.processScheduledNotifications();
      if (n > 0) this.log.log(`${n} geplande agenda-melding(en) verstuurd.`);
    } catch (e) {
      this.log.error(
        `Agenda-herinneringen tick mislukt: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      this.running = false;
    }
  }
}
