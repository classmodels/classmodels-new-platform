import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { PortalModule } from '../portal/portal.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminRolesController } from './admin-roles.controller';
import { AdminRolesService } from './admin-roles.service';
import { AdminReviewsController } from './admin-reviews.controller';
import { AdminMollieController } from './admin-mollie.controller';
import { AdminAuditController } from './admin-audit.controller';
import { AdminSubscriptionsController } from './admin-subscriptions.controller';
import { AdminPluginsController } from './admin-plugins.controller';
import { AdminBriefsController } from './admin-briefs.controller';

@Module({
  imports: [PrismaModule, AuthModule, ReviewsModule, PortalModule],
  controllers: [
    AdminUsersController,
    AdminRolesController,
    AdminReviewsController,
    AdminMollieController,
    AdminAuditController,
    AdminSubscriptionsController,
    AdminPluginsController,
    AdminBriefsController,
  ],
  providers: [AdminUsersService, AdminRolesService],
})
export class AdminModule {}
