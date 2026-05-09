import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BriefStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { BriefsService } from './briefs.service';

class CreateClientBriefDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(10)
  body!: string;
}

class PatchClientBriefDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsEnum(BriefStatus)
  status?: BriefStatus;
}

@Controller('portal/client/briefs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PortalClientBriefsController {
  constructor(private briefs: BriefsService) {}

  @Get()
  @Permissions('portal.client.briefs.read')
  list(@Req() req: { user: JwtPayload }) {
    return this.briefs.listForClient(req.user.sub);
  }

  @Get(':id')
  @Permissions('portal.client.briefs.read')
  get(@Req() req: { user: JwtPayload }, @Param('id', ParseUUIDPipe) id: string) {
    return this.briefs.getForClient(req.user.sub, id);
  }

  @Post()
  @Permissions('portal.client.briefs.write')
  create(@Req() req: { user: JwtPayload }, @Body() dto: CreateClientBriefDto) {
    return this.briefs.createForClient(req.user.sub, dto.title, dto.body);
  }

  @Patch(':id')
  @Permissions('portal.client.briefs.write')
  patch(
    @Req() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchClientBriefDto,
  ) {
    return this.briefs.updateForClient(req.user.sub, id, dto);
  }
}
