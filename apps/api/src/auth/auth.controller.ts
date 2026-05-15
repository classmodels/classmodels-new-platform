import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { JwtPayload } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Permissions } from './permissions.decorator';
import { PermissionsGuard } from './permissions.guard';
import { AuthService } from './auth.service';
import {
  ApplySharedPasswordDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginBodyDto,
  ResetPasswordDto,
} from './dto/auth-password.dto';
import { ImpersonateDto } from './dto/impersonate.dto';

class RegisterDto {
  @IsIn(['model', 'client'])
  role!: 'model' | 'client';

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  companyName?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('impersonate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.users.write')
  @HttpCode(HttpStatus.OK)
  impersonate(@Req() req: { user: JwtPayload }, @Body() dto: ImpersonateDto) {
    return this.auth.impersonateModel(req.user.sub, dto.targetUserId);
  }

  @Post('login')
  login(@Body() dto: LoginBodyDto) {
    const identifier = (dto.identifier || dto.email || '').trim();
    return this.auth.login(identifier, dto.password);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register({
      role: dto.role,
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      companyName: dto.companyName,
    });
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  changePassword(@Req() req: { user: JwtPayload }, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(req.user.sub, dto.currentPassword, dto.newPassword);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.identifier);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPasswordWithToken(dto.token, dto.newPassword);
  }

  @Post('admin/apply-shared-password')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.users.write')
  @HttpCode(HttpStatus.OK)
  applySharedPassword(@Body() dto: ApplySharedPasswordDto) {
    return this.auth.applySharedTemporaryPassword(dto.password, dto.excludeEmail);
  }
}
