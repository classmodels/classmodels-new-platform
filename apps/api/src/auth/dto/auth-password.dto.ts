import { IsOptional, IsString, MinLength } from 'class-validator';

export class LoginBodyDto {
  /** E-mail of telefoonnummer */
  @IsOptional()
  @IsString()
  identifier?: string;

  /** @deprecated gebruik identifier */
  @IsOptional()
  @IsString()
  email?: string;

  @IsString()
  @MinLength(6)
  password!: string;

  /** true = langer JWT (localStorage); false = sessie (tab sluiten). */
  @IsOptional()
  rememberMe?: boolean;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class ForgotPasswordDto {
  /** E-mail of telefoonnummer */
  @IsString()
  @MinLength(3)
  identifier!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(32)
  token!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class ApplySharedPasswordDto {
  @IsString()
  @MinLength(10)
  password!: string;

  /** Standaard: admin@class-models.local */
  @IsOptional()
  @IsString()
  excludeEmail?: string;
}
