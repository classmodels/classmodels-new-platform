import { Module, forwardRef } from '@nestjs/common';
import { ModelPortalHistoryService } from './model-portal-history.service';
import { PushModule } from '../push/push.module';

@Module({
  imports: [forwardRef(() => PushModule)],
  providers: [ModelPortalHistoryService],
  exports: [ModelPortalHistoryService],
})
export class ModelPortalHistoryModule {}
