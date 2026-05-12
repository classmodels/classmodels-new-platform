import { Body, Controller, Delete, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { ModelPortalHistoryService } from './model-portal-history.service';

class LogMailtoDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  bodyChars?: number;
}

@Controller('portal/model/history')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PortalModelHistoryController {
  constructor(private readonly history: ModelPortalHistoryService) {}

  @Get()
  @Permissions('portal.model.history.read')
  list(@Req() req: { user: JwtPayload }, @Query('take') take?: string) {
    return this.history.listForUser(req.user.sub, take);
  }

  @Delete()
  @Permissions('portal.model.history.read')
  clear(@Req() req: { user: JwtPayload }) {
    return this.history.clearForUser(req.user.sub);
  }

  /** Client roept dit aan vóór `mailto:` (geen mail via server). */
  @Post('message-intent')
  @Permissions('portal.model.history.read')
  logMessageIntent(@Req() req: { user: JwtPayload }, @Body() body: LogMailtoDto) {
    return this.history.log(req.user.sub, 'message_mailto', {
      subject: (body.subject ?? '').trim().slice(0, 200),
      bodyChars: body.bodyChars ?? 0,
    });
  }
}
