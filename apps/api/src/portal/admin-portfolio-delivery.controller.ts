import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { IsArray, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { PortfolioDeliveryService } from './portfolio-delivery.service';

class BulkMailDto {
  @IsArray()
  @IsUUID('4', { each: true })
  modelUserIds!: string[];

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(20000)
  bodyHtml!: string;
}

@Controller('admin/portfolio-delivery')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminPortfolioDeliveryController {
  constructor(private readonly delivery: PortfolioDeliveryService) {}

  @Get()
  @Permissions('admin.media.read')
  list(@Query('day') day?: string) {
    return this.delivery.listAdmin(day?.trim() || undefined);
  }

  @Post('bulk-mail')
  @Permissions('admin.media.write')
  bulkMail(@Body() dto: BulkMailDto) {
    return this.delivery.bulkMail(dto);
  }

  @Get(':modelUserId/zip')
  @Permissions('admin.media.read')
  async adminZip(
    @Param('modelUserId', ParseUUIDPipe) modelUserId: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    await this.delivery.streamZip(modelUserId, res, { consume: false });
  }

  @Post(':modelUserId/reactivate')
  @Permissions('admin.media.write')
  reactivate(@Param('modelUserId', ParseUUIDPipe) modelUserId: string) {
    return this.delivery.clearAck(modelUserId);
  }

  @Delete(':modelUserId')
  @Permissions('admin.media.write')
  remove(@Param('modelUserId', ParseUUIDPipe) modelUserId: string) {
    return this.delivery.hardDeleteFiles(modelUserId);
  }
}

