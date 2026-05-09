import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { MenusService } from '../menus/menus.service';
import {
  CreateMenuAdminDto,
  CreateMenuItemAdminDto,
  UpdateMenuAdminDto,
  UpdateMenuItemAdminDto,
} from './dto/menu-admin.dto';

@Controller('admin/menus')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminMenusController {
  constructor(private menus: MenusService) {}

  @Get()
  @Permissions('admin.menus.read')
  list() {
    return this.menus.listAll();
  }

  @Patch('items/:itemId')
  @Permissions('admin.menus.write')
  updateItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateMenuItemAdminDto,
  ) {
    return this.menus.updateItem(itemId, dto);
  }

  @Delete('items/:itemId')
  @Permissions('admin.menus.write')
  deleteItem(@Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.menus.deleteItem(itemId);
  }

  @Post()
  @Permissions('admin.menus.write')
  create(@Body() dto: CreateMenuAdminDto) {
    return this.menus.createMenu(dto);
  }

  @Patch(':menuId')
  @Permissions('admin.menus.write')
  updateMenu(
    @Param('menuId', ParseUUIDPipe) menuId: string,
    @Body() dto: UpdateMenuAdminDto,
  ) {
    return this.menus.updateMenu(menuId, dto);
  }

  @Delete(':menuId')
  @Permissions('admin.menus.write')
  deleteMenu(@Param('menuId', ParseUUIDPipe) menuId: string) {
    return this.menus.deleteMenu(menuId);
  }

  @Post(':menuId/items')
  @Permissions('admin.menus.write')
  addItem(
    @Param('menuId', ParseUUIDPipe) menuId: string,
    @Body() dto: CreateMenuItemAdminDto,
  ) {
    return this.menus.createItem(menuId, dto);
  }
}
