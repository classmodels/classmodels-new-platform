import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminAgendaController } from './admin-agenda.controller';
import { AgendaPublicController } from './agenda-public.controller';
import { AgendaNotificationService } from './agenda-notifications.service';
import { AgendaService } from './agenda.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AgendaPublicController, AdminAgendaController],
  providers: [AgendaService, AgendaNotificationService],
  exports: [AgendaService],
})
export class AgendaModule {}
