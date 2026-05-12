import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { AdminPushService } from './admin-push.service';
import {
  AddListMemberDto,
  BroadcastPushDto,
  CreatePushListDto,
  PatchPushListDto,
} from './dto/push.dto';

@Controller('admin/push')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminPushController {
  constructor(private readonly adminPush: AdminPushService) {}

  @Get('lists')
  @Permissions('admin.push.lists')
  lists() {
    return this.adminPush.listLists();
  }

  /** Minimale lijst voor dropdown bij broadcast (mag met alleen `admin.push.send`). */
  @Get('recipient-lists-for-broadcast')
  @Permissions('admin.push.send')
  listsForBroadcast() {
    return this.adminPush.listLists();
  }

  @Post('lists')
  @Permissions('admin.push.lists')
  createList(@Req() req: { user: JwtPayload }, @Body() dto: CreatePushListDto) {
    return this.adminPush.createList(dto, req.user.sub);
  }

  @Patch('lists/:id')
  @Permissions('admin.push.lists')
  patchList(@Param('id') id: string, @Body() dto: PatchPushListDto) {
    return this.adminPush.patchList(id, dto);
  }

  @Delete('lists/:id')
  @Permissions('admin.push.lists')
  deleteList(@Param('id') id: string) {
    return this.adminPush.deleteList(id);
  }

  @Get('lists/:id/members')
  @Permissions('admin.push.lists')
  listMembers(@Param('id') id: string) {
    return this.adminPush.listMembers(id);
  }

  @Post('lists/:id/members')
  @Permissions('admin.push.lists')
  addMember(@Param('id') id: string, @Body() dto: AddListMemberDto) {
    return this.adminPush.addMember(id, dto);
  }

  @Delete('lists/:id/members/:userId')
  @Permissions('admin.push.lists')
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.adminPush.removeMember(id, userId);
  }

  @Post('broadcast')
  @Permissions('admin.push.send')
  broadcast(@Req() req: { user: JwtPayload }, @Body() dto: BroadcastPushDto) {
    return this.adminPush.broadcast(req.user.sub, dto);
  }

  @Get('campaigns')
  @Permissions('admin.push.send')
  campaigns(@Query('take') take?: string) {
    return this.adminPush.recentCampaigns(take);
  }
}
