import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

/** Vraagt de website elke minuut om herinneringen die minstens 10 minuten openstaan. */
@Injectable()
export class ModelIntakeReminderScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(ModelIntakeReminderScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  onModuleInit() {
    const tick = () => {
      void fetch('https://www.class-models.be/api/model-intake?remind=1', { cache: 'no-store' })
        .then(async (res) => {
          if (!res.ok) this.log.warn(`Modelanalyse-herinnering: site antwoordde ${res.status}`);
        })
        .catch((error: unknown) => {
          this.log.warn(`Modelanalyse-herinnering niet bereikt: ${error instanceof Error ? error.message : 'fout'}`);
        });
    };
    tick();
    this.timer = setInterval(tick, 60_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
