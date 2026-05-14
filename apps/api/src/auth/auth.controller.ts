import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { JwtPayload } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Permissions } from './permissions.decorator';
import { PermissionsGuard } from './permissions.guard';
import { AuthService } from './auth.service';
import { ImpersonateDto } from './dto/impersonate.dto';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

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
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
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
}
