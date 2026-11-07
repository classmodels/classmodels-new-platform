import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

/** Vraagt de website elke minuut om herinneringen die minstens 10 minuten openstaan. */
@Injectable()
export class ModelIntakeReminderScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(ModelIntakeReminderScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  onModuleInit() {
    this.log.log('Modelanalyse-herinnering staat uit.');
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
