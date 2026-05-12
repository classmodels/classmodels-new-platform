import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import {
  PatchModelPushSettingsDto,
  SubscribePushDto,
  UnsubscribePushDto,
  InboxIdsDto,
} from './dto/push.dto';
import { ModelPushService } from './model-push.service';

@Controller('portal/model/push')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PortalModelPushController {
  constructor(private readonly modelPush: ModelPushService) {}

  @Get('summary')
  @Permissions('portal.model.push.read')
  summary(@Req() req: { user: JwtPayload }) {
    return this.modelPush.getSummaryForUser(req.user.sub);
  }

  @Get('inbox')
  @Permissions('portal.model.push.read')
  inbox(@Req() req: { user: JwtPayload }, @Query('take') take?: string) {
    return this.modelPush.listInbox(req.user.sub, take);
  }

  @Patch('inbox/:id/read')
  @Permissions('portal.model.push.read')
  markRead(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.modelPush.markRead(req.user.sub, id);
  }

  @Post('inbox/read-all')
  @Permissions('portal.model.push.read')
  markAllRead(@Req() req: { user: JwtPayload }) {
    return this.modelPush.markAllRead(req.user.sub);
  }

  @Post('inbox/read-many')
  @Permissions('portal.model.push.read')
  markReadMany(@Req() req: { user: JwtPayload }, @Body() dto: InboxIdsDto) {
    return this.modelPush.markReadMany(req.user.sub, dto.ids);
  }

  @Post('inbox/delete-many')
  @Permissions('portal.model.push.read')
  deleteMany(@Req() req: { user: JwtPayload }, @Body() dto: InboxIdsDto) {
    return this.modelPush.deleteMany(req.user.sub, dto.ids);
  }

  @Delete('inbox/:id')
  @Permissions('portal.model.push.read')
  deleteOne(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.modelPush.deleteOne(req.user.sub, id);
  }

  @Patch('settings')
  @Permissions('portal.model.push.read')
  patchSettings(@Req() req: { user: JwtPayload }, @Body() dto: PatchModelPushSettingsDto) {
    return this.modelPush.patchSettings(req.user.sub, dto);
  }

  @Post('subscribe')
  @Permissions('portal.model.push.subscribe')
  subscribe(
    @Req() req: { user: JwtPayload } & { headers: Record<string, string | string[] | undefined> },
    @Body() dto: SubscribePushDto,
  ) {
    const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
    return this.modelPush.subscribe(req.user.sub, dto, ua);
  }

  @Post('unsubscribe')
  @Permissions('portal.model.push.subscribe')
  unsubscribe(@Req() req: { user: JwtPayload }, @Body() dto: UnsubscribePushDto) {
    return this.modelPush.unsubscribe(req.user.sub, dto.endpoint);
  }
}
