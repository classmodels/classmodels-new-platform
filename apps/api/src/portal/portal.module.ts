import { Module } from '@nestjs/common';
import { AgendaModule } from '../agenda/agenda.module';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { BriefsService } from './briefs.service';
import { PortalClientBriefsController } from './portal-client-briefs.controller';
import { PortalModelAgendaController } from './portal-model-agenda.controller';
import { PortalModelBriefsController } from './portal-model-briefs.controller';
import { PortalModelMediaController } from './portal-model-media.controller';

@Module({
  imports: [AuthModule, MediaModule, AgendaModule],
  controllers: [
    PortalClientBriefsController,
    PortalModelBriefsController,
    PortalModelMediaController,
    PortalModelAgendaController,
  ],
  providers: [BriefsService],
  exports: [BriefsService],
})
export class PortalModule {}
