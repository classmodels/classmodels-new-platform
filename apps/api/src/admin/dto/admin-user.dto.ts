import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Portal, UserStatus } from '@prisma/client';

export class CreateAdminUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsEnum(Portal)
  defaultPortal?: Portal;

  @IsArray()
  @IsString({ each: true })
  roleSlugs!: string[];
}

export class UpdateAdminUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsEnum(Portal)
  defaultPortal?: Portal;

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @IsOptional()
  premiumUntil?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleSlugs?: string[];

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsObject()
  modelSheet?: Record<string, unknown>;
}

export class DeleteManyUsersDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}
