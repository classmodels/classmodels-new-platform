import { Module } from '@nestjs/common';
import { AgendaModule } from '../agenda/agenda.module';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { BriefsService } from './briefs.service';
import { ModelPortalHistoryModule } from './model-portal-history.module';
import { PortalClientBriefsController } from './portal-client-briefs.controller';
import { PortalModelAgendaController } from './portal-model-agenda.controller';
import { PortalModelBriefsController } from './portal-model-briefs.controller';
import { PortalModelHistoryController } from './portal-model-history.controller';
import { PortalModelMediaController } from './portal-model-media.controller';

@Module({
  imports: [AuthModule, MediaModule, AgendaModule, ModelPortalHistoryModule],
  controllers: [
    PortalClientBriefsController,
    PortalModelBriefsController,
    PortalModelMediaController,
    PortalModelAgendaController,
    PortalModelHistoryController,
  ],
  providers: [BriefsService],
  exports: [BriefsService],
})
export class PortalModule {}
