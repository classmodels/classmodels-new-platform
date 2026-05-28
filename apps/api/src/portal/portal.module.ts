import { Module } from '@nestjs/common';
import { AgendaModule } from '../agenda/agenda.module';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { PaymentsModule } from '../payments/payments.module';
import { PushModule } from '../push/push.module';
import { BriefsService } from './briefs.service';
import { ModelPortalHistoryModule } from './model-portal-history.module';
import { PortalClientBriefsController } from './portal-client-briefs.controller';
import { PortalModelAgendaController } from './portal-model-agenda.controller';
import { PortalModelBriefsController } from './portal-model-briefs.controller';
import { PortalModelHistoryController } from './portal-model-history.controller';
import { PortalModelMediaController } from './portal-model-media.controller';
import { PortalModelModeshowDownloadsController } from './portal-model-modeshow-downloads.controller';
import {
  AdminPortalDownloadsController,
  PortalDownloadsController,
} from './portal-downloads.controller';
import { PortalDownloadsService } from './portal-downloads.service';
import { PortalModelSetCardController } from './portal-model-set-card.controller';
import { PortalModelTryoutModeshowController } from './portal-model-tryout-modeshow.controller';
import { PortalModelReviewsController } from './portal-model-reviews.controller';
import { ReviewsModule } from '../reviews/reviews.module';
import { TryoutModeshowService } from './tryout-modeshow.service';
import { ModelSetCardService } from './model-set-card.service';

@Module({
  imports: [AuthModule, MediaModule, AgendaModule, ModelPortalHistoryModule, PushModule, PaymentsModule, ReviewsModule],
  controllers: [
    PortalClientBriefsController,
    PortalModelBriefsController,
    PortalModelMediaController,
    PortalModelAgendaController,
    PortalModelHistoryController,
    PortalModelTryoutModeshowController,
    PortalModelModeshowDownloadsController,
    PortalDownloadsController,
    AdminPortalDownloadsController,
    PortalModelSetCardController,
    PortalModelReviewsController,
  ],
  providers: [BriefsService, TryoutModeshowService, ModelSetCardService, PortalDownloadsService],
  exports: [BriefsService, ModelSetCardService],
})
export class PortalModule {}
