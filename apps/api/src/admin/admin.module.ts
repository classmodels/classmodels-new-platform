import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { PortalModule } from '../portal/portal.module';
import { MediaModule } from '../media/media.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminRolesController } from './admin-roles.controller';
import { AdminRolesService } from './admin-roles.service';
import { AdminReviewsController } from './admin-reviews.controller';
import { AdminMollieController } from './admin-mollie.controller';
import { AdminAuditController } from './admin-audit.controller';
import { AdminSubscriptionsController } from './admin-subscriptions.controller';
import { AdminPremiumController } from './admin-premium.controller';
import { AdminPremiumService } from './admin-premium.service';
import { AdminPluginsController } from './admin-plugins.controller';
import { AdminBriefsController } from './admin-briefs.controller';
import { AdminTryoutModeshowController } from './admin-tryout-modeshow.controller';
import { AdminTryoutModeshowService } from './admin-tryout-modeshow.service';
import { AdminSiteSmtpController } from './admin-site-smtp.controller';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PrismaModule, AuthModule, ReviewsModule, PortalModule, MediaModule, PaymentsModule],
  controllers: [
    AdminUsersController,
    AdminRolesController,
    AdminReviewsController,
    AdminMollieController,
    AdminSiteSmtpController,
    AdminAuditController,
    AdminSubscriptionsController,
    AdminPremiumController,
    AdminPluginsController,
    AdminBriefsController,
    AdminTryoutModeshowController,
  ],
  providers: [AdminUsersService, AdminRolesService, AdminTryoutModeshowService, AdminPremiumService],
})
export class AdminModule {}
