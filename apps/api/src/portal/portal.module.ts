import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { BriefsService } from './briefs.service';
import { PortalClientBriefsController } from './portal-client-briefs.controller';
import { PortalModelBriefsController } from './portal-model-briefs.controller';
import { PortalModelMediaController } from './portal-model-media.controller';

@Module({
  imports: [AuthModule, MediaModule],
  controllers: [
    PortalClientBriefsController,
    PortalModelBriefsController,
    PortalModelMediaController,
  ],
  providers: [BriefsService],
  exports: [BriefsService],
})
export class PortalModule {}
