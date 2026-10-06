import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { OpenModellendagService } from './open-modellendag.service';

@Controller('admin/open-modellendag')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminOpenModellendagController {
  constructor(private service: OpenModellendagService) {}

  @Get()
  @Permissions('admin.agenda.read')
  list() {
    return this.service.listAdmin();
  }
}
