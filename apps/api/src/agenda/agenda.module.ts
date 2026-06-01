import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ModelPortalHistoryModule } from '../portal/model-portal-history.module';
import { AdminAgendaController } from './admin-agenda.controller';
import { AdminBulkMessagingController } from './admin-bulk-messaging.controller';
import { AgendaPublicController } from './agenda-public.controller';
import { AgendaNotificationService } from './agenda-notifications.service';
import { AgendaReminderScheduler } from './agenda-reminder.scheduler';
import { AgendaTravelService } from './agenda-travel.service';
import { AgendaService } from './agenda.service';
import { BulkMessagingService } from './bulk-messaging.service';

@Module({
  imports: [PrismaModule, AuthModule, MediaModule, ModelPortalHistoryModule],
  controllers: [AgendaPublicController, AdminAgendaController, AdminBulkMessagingController],
  providers: [
    AgendaService,
    AgendaNotificationService,
    AgendaTravelService,
    AgendaReminderScheduler,
    BulkMessagingService,
  ],
  exports: [AgendaService, AgendaNotificationService],
})
export class AgendaModule {}
