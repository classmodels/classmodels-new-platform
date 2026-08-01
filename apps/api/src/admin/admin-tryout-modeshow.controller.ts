import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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

  @Post('mail')
  @Permissions('admin.billing.write')
  mail(@Body() dto: TryoutMailDto) {
    return this.tryoutAdmin.sendMail(dto);
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
