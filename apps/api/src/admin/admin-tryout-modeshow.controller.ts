import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import {
  AdminTryoutModeshowService,
  type TryoutPipelinePhase,
} from './admin-tryout-modeshow.service';

class TryoutMailDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  registrationIds?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(['paid', 'awaiting_payment', 'awaiting_terms', 'declined', 'no_response'], { each: true })
  phases?: TryoutPipelinePhase[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  userIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  editionSlug?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50000)
  html!: string;
}

class TryoutPushDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  registrationIds?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(['paid', 'awaiting_payment', 'awaiting_terms', 'declined', 'no_response'], { each: true })
  phases?: TryoutPipelinePhase[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  userIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  editionSlug?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  body!: string;
}

class CreateTryoutCouponDto {
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  code!: string;

  @IsIn(['percent', 'fixed'])
  discountType!: 'percent' | 'fixed';

  @IsNumber()
  @Min(0.01)
  discountValue!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTotalUses?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsesPerUser?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  editionSlug?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string | null;
}

class PatchTryoutCouponDto {
  @IsOptional()
  @IsIn(['percent', 'fixed'])
  discountType?: 'percent' | 'fixed';

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  discountValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTotalUses?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsesPerUser?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  editionSlug?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string | null;
}

@Controller('admin/tryout-modeshow')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminTryoutModeshowController {
  constructor(private tryoutAdmin: AdminTryoutModeshowService) {}

  @Get('registrations')
  @Permissions('admin.billing.read')
  registrations(
    @Query('editionSlug') editionSlugRaw?: string,
    @Query('search') searchRaw?: string,
  ) {
    return this.tryoutAdmin.listRegistrations(editionSlugRaw, searchRaw);
  }

  @Get('tryout-role-models')
  @Permissions('admin.billing.read')
  tryoutRoleModels(
    @Query('editionSlug') editionSlugRaw?: string,
    @Query('search') searchRaw?: string,
  ) {
    return this.tryoutAdmin.listTryoutRoleModels(editionSlugRaw, searchRaw);
  }

  @Delete('registrations/:id')
  @Permissions('admin.billing.write')
  deleteRegistration(@Param('id') id: string) {
    return this.tryoutAdmin.deleteRegistration(id);
  }

  @Post('registrations/:id/reset')
  @Permissions('admin.billing.write')
  resetRegistration(@Param('id') id: string) {
    return this.tryoutAdmin.resetRegistration(id);
  }

  @Post('mail')
  @Permissions('admin.billing.write')
  mail(@Body() dto: TryoutMailDto) {
    return this.tryoutAdmin.sendMail(dto);
  }

  @Post('push')
  @Permissions('admin.billing.write')
  push(@Req() req: { user: JwtPayload }, @Body() dto: TryoutPushDto) {
    return this.tryoutAdmin.sendPush({ ...dto, adminUserId: req.user.sub });
  }

  @Get('coupons')
  @Permissions('admin.billing.read')
  coupons() {
    return this.tryoutAdmin.listCoupons();
  }

  @Post('coupons')
  @Permissions('admin.billing.write')
  createCoupon(@Body() dto: CreateTryoutCouponDto) {
    return this.tryoutAdmin.createCoupon(dto);
  }

  @Patch('coupons/:id')
  @Permissions('admin.billing.write')
  patchCoupon(@Param('id') id: string, @Body() dto: PatchTryoutCouponDto) {
    return this.tryoutAdmin.updateCoupon(id, dto);
  }
}
