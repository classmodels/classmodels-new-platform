import { Body, Controller, Delete, Get, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Portal } from '@prisma/client';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';

class PatchContentDto {
  @IsString()
  @MinLength(1)
  key!: string;

  @IsString()
  @MinLength(1)
  value!: string;

  @IsOptional()
  @IsString()
  locale?: string;
}

class CreateContentDto {
  @IsString()
  @MinLength(1)
  key!: string;

  @IsString()
  @MinLength(1)
  value!: string;

  @IsOptional()
  @IsEnum(Portal)
  portal?: Portal;

  @IsOptional()
  @IsString()
  locale?: string;
}

class DeleteContentDto {
  @IsString()
  @MinLength(1)
  key!: string;

  @IsOptional()
  @IsString()
  locale?: string;
}

@Controller('content')
export class ContentController {
  constructor(private content: ContentService) {}

  @Get('strings')
  list(@Query('locale') locale?: string) {
    return this.content.listStrings(locale);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('content.strings.write')
  @Patch('strings')
  patch(@Body() dto: PatchContentDto, @Req() req: { user: JwtPayload }) {
    return this.content.patchString(dto.key, dto.value, req.user.sub, dto.locale);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('content.strings.write')
  @Post('strings')
  create(@Body() dto: CreateContentDto, @Req() req: { user: JwtPayload }) {
    return this.content.createString(dto.key, dto.value, req.user.sub, dto.portal, dto.locale);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('content.strings.write')
  @Delete('strings')
  remove(@Body() dto: DeleteContentDto) {
    return this.content.removeString(dto.key, dto.locale);
  }
}
