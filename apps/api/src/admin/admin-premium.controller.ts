import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { AdminPremiumService } from './admin-premium.service';

@Controller('admin/premium')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminPremiumController {
  constructor(private svc: AdminPremiumService) {}

  @Get('overview')
  @Permissions('admin.subscriptions.read')
  overview() {
    return this.svc.overview();
  }
}
