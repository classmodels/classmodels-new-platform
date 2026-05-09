import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { BriefStatus } from '@prisma/client';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { BriefsService } from '../portal/briefs.service';

class AdminPatchBriefDto {
  @IsOptional()
  @IsEnum(BriefStatus)
  status?: BriefStatus;
}

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

  @Patch('model-responses/:responseId')
  @Permissions('admin.briefs.write')
  patchResponse(
    @Param('responseId', ParseUUIDPipe) responseId: string,
    @Body() dto: AdminPatchResponseDto,
  ) {
    return this.briefs.adminSetResponseStatus(responseId, dto.status);
  }

  @Get(':id')
  @Permissions('admin.briefs.read')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.briefs.adminGet(id);
  }

  @Patch(':id')
  @Permissions('admin.briefs.write')
  patch(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AdminPatchBriefDto) {
    return this.briefs.adminPatch(id, dto);
  }
}
