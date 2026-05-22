import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { BulkCommsService } from './bulk-comms.service';
import {
  AddBulkListEntryDto,
  BulkCommsPreviewDto,
  BulkCommsSendDto,
  CreateBulkContactListDto,
  ImportBulkListEntriesDto,
  UpdateBulkContactListDto,
} from './dto/bulk-comms.dto';

@Controller('admin/comms')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminBulkCommsController {
  constructor(private readonly comms: BulkCommsService) {}

  @Get('roles')
  @Permissions('admin.push.send')
  roles() {
    return this.comms.rolesForPicker();
  }

  @Get('lists')
  @Permissions('admin.push.lists')
  lists() {
    return this.comms.listContactLists();
  }

  @Get('lists/options')
  @Permissions('admin.push.send')
  listOptions() {
    return this.comms.listContactLists();
  }

  @Get('lists/:id')
  @Permissions('admin.push.lists')
  listDetail(@Param('id') id: string) {
    return this.comms.getContactList(id);
  }

  @Post('lists')
  @Permissions('admin.push.lists')
  createList(@Req() req: { user: JwtPayload }, @Body() dto: CreateBulkContactListDto) {
    return this.comms.createContactList(dto, req.user.sub);
  }

  @Patch('lists/:id')
  @Permissions('admin.push.lists')
  updateList(@Param('id') id: string, @Body() dto: UpdateBulkContactListDto) {
    return this.comms.updateContactList(id, dto);
  }

  @Delete('lists/:id')
  @Permissions('admin.push.lists')
  deleteList(@Param('id') id: string) {
    return this.comms.deleteContactList(id);
  }

  @Post('lists/:id/entries')
  @Permissions('admin.push.lists')
  addEntry(@Param('id') id: string, @Body() dto: AddBulkListEntryDto) {
    return this.comms.addListEntry(id, dto);
  }

  @Delete('lists/:listId/entries/:entryId')
  @Permissions('admin.push.lists')
  removeEntry(@Param('listId') listId: string, @Param('entryId') entryId: string) {
    return this.comms.removeListEntry(listId, entryId);
  }

  @Post('lists/:id/import')
  @Permissions('admin.push.lists')
  importEntries(@Param('id') id: string, @Body() dto: ImportBulkListEntriesDto) {
    return this.comms.importListEntries(id, dto);
  }

  @Post('preview')
  @Permissions('admin.push.send')
  preview(@Body() dto: BulkCommsPreviewDto) {
    return this.comms.preview(dto);
  }

  @Post('send')
  @Permissions('admin.push.send')
  send(@Req() req: { user: JwtPayload }, @Body() dto: BulkCommsSendDto) {
    return this.comms.send(dto, req.user.sub);
  }

  @Get('campaigns')
  @Permissions('admin.push.send')
  campaigns() {
    return this.comms.listCampaigns();
  }

  @Get('campaigns/:id/status')
  @Permissions('admin.push.send')
  campaignStatus(@Param('id') id: string) {
    return this.comms.getCampaignStatus(id);
  }

  @Get('campaigns/:id')
  @Permissions('admin.push.send')
  campaign(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('take') take?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const t = take ? parseInt(take, 10) : 80;
    return this.comms.getCampaign(id, Number.isFinite(p) ? p : 1, Number.isFinite(t) ? t : 80);
  }

  @Post('campaigns/:id/process-batch')
  @Permissions('admin.push.send')
  processBatch(
    @Param('id') id: string,
    @Body() body: { retryFailed?: boolean },
  ) {
    return this.comms.processCampaignBatch(id, { retryFailed: !!body?.retryFailed });
  }

  @Post('campaigns/:id/retry-failed')
  @Permissions('admin.push.send')
  retryFailed(@Param('id') id: string) {
    return this.comms.processCampaignBatch(id, { retryFailed: true });
  }

  @Get('unsubscribes')
  @Permissions('admin.push.send')
  unsubscribes() {
    return this.comms.listUnsubscribes();
  }

  @Delete('unsubscribes/:id')
  @Permissions('admin.push.send')
  removeUnsubscribe(@Param('id') id: string) {
    return this.comms.removeUnsubscribe(id);
  }

  @Post('lists/:id/dedupe')
  @Permissions('admin.push.lists')
  dedupeList(@Param('id') id: string) {
    return this.comms.dedupeContactList(id);
  }
}
