import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ModeshowTicketsService } from './modeshow-tickets.service';
import { ModeshowTicketsPublicController } from './modeshow-tickets-public.controller';
import { ModeshowTicketsAdminController } from './modeshow-tickets-admin.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ModeshowTicketsPublicController, ModeshowTicketsAdminController],
  providers: [ModeshowTicketsService],
  exports: [ModeshowTicketsService],
})
export class ModeshowTicketsModule implements OnModuleInit {
  private readonly log = new Logger(ModeshowTicketsModule.name);

  constructor(private tickets: ModeshowTicketsService) {}

  async onModuleInit() {
    try {
      const r = await this.tickets.ensureDemoEventIfEmpty();
      if (r.created) this.log.log('Demo modeshow-event aangemaakt (lege tabel).');
    } catch (e) {
      this.log.warn(
        `Modeshow demo-event bij start overgeslagen: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
