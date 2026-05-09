import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Portal } from '@prisma/client';

export class CreateMenuAdminDto {
  @IsString()
  @MinLength(1)
  slug!: string;

  @IsString()
  @MinLength(1)
  label!: string;

  @IsEnum(Portal)
  portal!: Portal;

  @IsString()
  @MinLength(1)
  placement!: string;
}

export class UpdateMenuAdminDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  placement?: string;

  @IsOptional()
  @IsEnum(Portal)
  portal?: Portal;
}

export class CreateMenuItemAdminDto {
  @IsString()
  @MinLength(1)
  label!: string;

  @IsString()
  @MinLength(1)
  href!: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  visibleWeb?: boolean;

  @IsOptional()
  @IsBoolean()
  visibleApp?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresPremium?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleSlugs?: string[];
}

export class UpdateMenuItemAdminDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  href?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  visibleWeb?: boolean;

  @IsOptional()
  @IsBoolean()
  visibleApp?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresPremium?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleSlugs?: string[];
}
