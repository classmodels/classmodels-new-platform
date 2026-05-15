import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ContentModule } from './content/content.module';
import { HealthModule } from './health/health.module';
import { MediaModule } from './media/media.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { MenusModule } from './menus/menus.module';
import { ReviewsModule } from './reviews/reviews.module';
import { PortalModule } from './portal/portal.module';
import { AgendaModule } from './agenda/agenda.module';
import { TestshootModule } from './testshoot/testshoot.module';
import { CatalogModule } from './catalog/catalog.module';
import { PushModule } from './push/push.module';
import { PhotographerModule } from './photographer/photographer.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ContentModule,
    HealthModule,
    MediaModule,
    PaymentsModule,
    AdminModule,
    MenusModule,
    ReviewsModule,
    PortalModule,
    AgendaModule,
    TestshootModule,
    CatalogModule,
    PushModule,
    PhotographerModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
