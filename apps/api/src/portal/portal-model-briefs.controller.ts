import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { BriefsService } from './briefs.service';

class RespondDto {
  /** Optioneel — lege string is toegestaan. */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  message?: string;
}

function bypassBriefEligibility(user: JwtPayload): boolean {
  return (
    user.roles.includes('admin') ||
    user.permissions.includes('*') ||
    user.permissions.some((p) => p.startsWith('admin.'))
  );
}

@Controller('portal/model/briefs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PortalModelBriefsController {
  constructor(private briefs: BriefsService) {}

  @Get()
  @Permissions('portal.model.briefs.read')
  list(@Req() req: { user: JwtPayload }) {
    return this.briefs.listOpenForModelUser(req.user.sub, {
      treatAsEligible: bypassBriefEligibility(req.user),
    });
  }

  @Get(':id')
  @Permissions('portal.model.briefs.read')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.briefs.getOpenForModel(id);
  }

  @Post(':id/responses')
  @Permissions('portal.model.briefs.respond')
  respond(
    @Req() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) briefId: string,
    @Body() dto: RespondDto,
  ) {
    return this.briefs.respondToBrief(briefId, req.user.sub, dto.message ?? '', {
      bypassEligibility: bypassBriefEligibility(req.user),
    });
  }

  @Post(':id/responses/withdraw')
  @Permissions('portal.model.briefs.respond')
  withdraw(@Req() req: { user: JwtPayload }, @Param('id', ParseUUIDPipe) briefId: string) {
    return this.briefs.withdrawResponse(briefId, req.user.sub);
  }
}
