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
  Req,
  UseGuards,
} from '@nestjs/common';
import type { JwtPayload } from '../auth/jwt.strategy';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { AdminUsersService } from './admin-users.service';
import { CreateAdminUserDto, DeleteManyUsersDto, UpdateAdminUserDto } from './dto/admin-user.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminUsersController {
  constructor(private svc: AdminUsersService) {}

  @Get()
  @Permissions('admin.users.read')
  list() {
    return this.svc.list();
  }

  @Get(':id')
  @Permissions('admin.users.read')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.get(id);
  }

  @Post()
  @Permissions('admin.users.write')
  create(@Body() dto: CreateAdminUserDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @Permissions('admin.users.write')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAdminUserDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Permissions('admin.users.write')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: { user: JwtPayload }, @Param('id', ParseUUIDPipe) id: string) {
    await this.svc.deleteUser(req.user.sub, id);
  }

  @Post('delete-many')
  @Permissions('admin.users.write')
  deleteMany(@Req() req: { user: JwtPayload }, @Body() dto: DeleteManyUsersDto) {
    return this.svc.deleteUsers(req.user.sub, dto.ids);
  }
}
