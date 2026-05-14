import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsIn } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { BriefsService } from '../portal/briefs.service';
import { AdminCreateBriefDto, AdminUpdateBriefDto } from './dto/admin-brief.dto';
import { BriefEmailContractPdfDto, BriefPushSelectedDto } from './dto/admin-brief-actions.dto';

class AdminPatchResponseDto {
  @IsIn(['accepted', 'declined'])
  status!: 'accepted' | 'declined';
}

@Controller('admin/briefs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminBriefsController {
  constructor(private briefs: BriefsService) {}

  @Get()
  @Permissions('admin.briefs.read')
  list() {
    return this.briefs.adminList();
  }

  @Post()
  @Permissions('admin.briefs.write')
  create(@Body() dto: AdminCreateBriefDto) {
    const { clientId, ...rest } = dto;
    return this.briefs.adminCreate(clientId, rest);
  }

  @Patch('model-responses/:responseId')
  @Permissions('admin.briefs.write')
  patchResponse(
    @Param('responseId', ParseUUIDPipe) responseId: string,
    @Body() dto: AdminPatchResponseDto,
  ) {
    return this.briefs.adminSetResponseStatus(responseId, dto.status);
  }

  @Get(':id/matching-summary')
  @Permissions('admin.briefs.read')
  matchingSummary(@Param('id', ParseUUIDPipe) id: string) {
    return this.briefs.adminMatchingSummary(id);
  }

  @Post(':id/push-selected')
  @Permissions('admin.briefs.write')
  pushSelected(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BriefPushSelectedDto) {
    return this.briefs.adminPushSelectedUsers(id, dto.userIds, dto.title ?? null, dto.body ?? null);
  }

  @Post(':id/email-contract-pdf')
  @Permissions('admin.briefs.write')
  emailContractPdf(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BriefEmailContractPdfDto) {
    return this.briefs.adminEmailContractPdfToUsers(id, dto.userIds);
  }

  @Post(':id/responses/:responseId/contract')
  @Permissions('admin.briefs.write')
  generateContract(
    @Param('id', ParseUUIDPipe) briefId: string,
    @Param('responseId', ParseUUIDPipe) responseId: string,
  ) {
    return this.briefs.generateContractAndNotify(briefId, responseId);
  }

  @Get(':id')
  @Permissions('admin.briefs.read')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.briefs.adminGet(id);
  }

  @Patch(':id')
  @Permissions('admin.briefs.write')
  patch(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AdminUpdateBriefDto) {
    return this.briefs.adminPatch(id, { ...dto } as Record<string, unknown>);
  }
}
