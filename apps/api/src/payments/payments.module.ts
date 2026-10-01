import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ModelPortalHistoryModule } from '../portal/model-portal-history.module';
import { ModeshowTicketsModule } from '../modeshow-tickets/modeshow-tickets.module';

@Module({
  imports: [PrismaModule, AuthModule, ModelPortalHistoryModule, forwardRef(() => ModeshowTicketsModule)],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
