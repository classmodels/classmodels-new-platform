import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminPushController } from './admin-push.controller';
import { AdminPushService } from './admin-push.service';
import { ModelPushService } from './model-push.service';
import { ModelPwaService } from './model-pwa.service';
import { PortalModelPushController } from './portal-model-push.controller';
import { PortalModelPwaController } from './portal-model-pwa.controller';
import { PushPublicController } from './push-public.controller';
import { WebPushDeliveryService } from './webpush-delivery.service';

@Module({
  imports: [PrismaModule, ConfigModule, forwardRef(() => AuthModule)],
  controllers: [
    PushPublicController,
    PortalModelPushController,
    PortalModelPwaController,
    AdminPushController,
  ],
  providers: [WebPushDeliveryService, ModelPushService, ModelPwaService, AdminPushService],
  exports: [ModelPushService, ModelPwaService, WebPushDeliveryService],
})
export class PushModule {}
