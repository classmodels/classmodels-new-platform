import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { JwtPayload } from '../auth/jwt.strategy';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { AdminUsersService } from './admin-users.service';
import { CreateAdminUserDto, DeleteManyUsersDto, UpdateAdminUserDto, BulkAddRolesDto, BulkMoveRolesDto, ToggleUserRoleDto } from './dto/admin-user.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminUsersController {
  constructor(private svc: AdminUsersService) {}

  @Get()
  @Permissions('admin.users.read')
  list() {
    return this.svc.list();
  }

  @Post('roles/bulk-add')
  @Permissions('admin.users.write')
  bulkAddRoles(@Body() dto: BulkAddRolesDto) {
    return this.svc.bulkAddRoles(dto.userIds, dto.roleSlug);
  }

  @Post('roles/bulk-move')
  @Permissions('admin.users.write')
  bulkMoveRoles(@Body() dto: BulkMoveRolesDto) {
    return this.svc.bulkMoveRoles(dto.userIds, dto.toSlug, dto.fromSlugs);
  }

  @Post('deleted/empty')
  @Permissions('admin.users.write')
  emptyDeleted(@Req() req: { user: JwtPayload }) {
    return this.svc.emptyTrash(req.user.sub);
  }

  @Post()
  @Permissions('admin.users.write')
  create(@Body() dto: CreateAdminUserDto) {
    return this.svc.create(dto);
  }

  @Post(':id/restore')
  @Permissions('admin.users.write')
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.restoreUser(id);
  }

  @Post(':id/roles/toggle')
  @Permissions('admin.users.write')
  toggleRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleUserRoleDto,
  ) {
    return this.svc.toggleGroupingRole(id, dto.roleSlug, dto.enabled);
  }

  @Get(':id')
  @Permissions('admin.users.read')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.get(id);
  }

  @Patch(':id')
  @Permissions('admin.users.write')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAdminUserDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Permissions('admin.users.write')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
    @Query('permanent') permanent?: string,
  ) {
    await this.svc.deleteUser(req.user.sub, id, permanent === '1' || permanent === 'true');
  }

  @Post('delete-many')
  @Permissions('admin.users.write')
  deleteMany(@Req() req: { user: JwtPayload }, @Body() dto: DeleteManyUsersDto) {
    return this.svc.deleteUsers(req.user.sub, dto.ids);
  }
}
