import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsIn } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { BriefsService } from '../portal/briefs.service';
import { AdminCreateBriefDto, AdminUpdateBriefDto } from './dto/admin-brief.dto';
import {
  BriefCustomModelMailDto,
  BriefEmailContractPdfDto,
  BriefPushSelectedDto,
  BriefSelfTestMailDto,
} from './dto/admin-brief-actions.dto';

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

  @Delete('model-responses/:responseId')
  @Permissions('admin.briefs.write')
  deleteResponse(@Param('responseId', ParseUUIDPipe) responseId: string) {
    return this.briefs.adminDeleteResponse(responseId);
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

  @Post(':id/email-model')
  @Permissions('admin.briefs.write')
  emailModel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BriefCustomModelMailDto) {
    return this.briefs.adminSendCustomModelMail(id, dto.modelUserId, dto.subject, dto.body);
  }

  @Post(':id/email-self-test')
  @Permissions('admin.briefs.write')
  emailSelfTest(
    @Req() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BriefSelfTestMailDto,
  ) {
    return this.briefs.adminSendSelfTestMail(id, req.user.sub, dto.kind, {
      subject: dto.subject,
      body: dto.body,
    });
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
