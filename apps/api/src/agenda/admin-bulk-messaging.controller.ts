import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { BulkMessagingService } from './bulk-messaging.service';
import { BulkMessagingPreviewDto, BulkMessagingSendDto } from './dto/agenda.dto';

@Controller('admin/messaging/bulk')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminBulkMessagingController {
  constructor(private readonly bulk: BulkMessagingService) {}

  @Get('recipient-lists')
  @Permissions('admin.agenda.read')
  recipientLists() {
    return this.bulk.recipientListsForAgendaAdmin();
  }

  @Get('roles')
  @Permissions('admin.agenda.read')
  rolesForBulk() {
    return this.bulk.rolesForBulkPicker();
  }

  @Post('preview')
  @Permissions('admin.agenda.read')
  preview(@Body() dto: BulkMessagingPreviewDto) {
    return this.bulk.preview(dto);
  }

  @Post('send')
  @Permissions('admin.agenda.write')
  send(@Req() req: { user: JwtPayload }, @Body() dto: BulkMessagingSendDto) {
    return this.bulk.send(dto, req.user.sub);
  }
}
