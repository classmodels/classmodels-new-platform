import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PERMISSION_CATALOG } from '../auth/permission-catalog';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { AdminRolesService } from './admin-roles.service';
import { UpdateRoleDto } from './dto/admin-role.dto';

@Controller('admin/roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminRolesController {
  constructor(private svc: AdminRolesService) {}

  @Get('permission-catalog')
  @Permissions('admin.roles.read')
  permissionCatalog() {
    return PERMISSION_CATALOG;
  }

  @Get()
  @Permissions('admin.roles.read')
  list() {
    return this.svc.list();
  }

  @Patch(':id')
  @Permissions('admin.roles.write')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto) {
    return this.svc.update(id, dto);
  }
}
