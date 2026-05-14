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
import { IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { BriefsService } from './briefs.service';

class RespondDto {
  @IsString()
  @MinLength(5)
  message!: string;
}

@Controller('portal/model/briefs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PortalModelBriefsController {
  constructor(private briefs: BriefsService) {}

  @Get()
  @Permissions('portal.model.briefs.read')
  list(@Req() req: { user: JwtPayload }) {
    return this.briefs.listOpenForModelUser(req.user.sub);
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
    return this.briefs.respondToBrief(briefId, req.user.sub, dto.message);
  }

  @Post(':id/responses/withdraw')
  @Permissions('portal.model.briefs.respond')
  withdraw(@Req() req: { user: JwtPayload }, @Param('id', ParseUUIDPipe) briefId: string) {
    return this.briefs.withdrawResponse(briefId, req.user.sub);
  }
}
