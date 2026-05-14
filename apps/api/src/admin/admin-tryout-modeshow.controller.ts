import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { AdminTryoutModeshowService } from './admin-tryout-modeshow.service';

@Controller('admin/tryout-modeshow')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminTryoutModeshowController {
  constructor(private tryoutAdmin: AdminTryoutModeshowService) {}

  /** Uitgebreide lijsten + zoekstring (naam/e-mail/GSM/WP-id). */
  @Get('registrations')
  @Permissions('admin.billing.read')
  registrations(
    @Query('editionSlug') editionSlugRaw?: string,
    @Query('search') searchRaw?: string,
  ) {
    return this.tryoutAdmin.listRegistrations(editionSlugRaw, searchRaw);
  }
}
