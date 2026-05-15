import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AgendaModule } from '../agenda/agenda.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { PermissionsGuard } from './permissions.guard';
import { createJwtModuleOptions } from './jwt-module-options';

@Module({
  imports: [
    UsersModule,
    forwardRef(() => AgendaModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => createJwtModuleOptions(),
    }),
  ],
  providers: [AuthService, JwtStrategy, PermissionsGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtModule, PassportModule, PermissionsGuard],
})
export class AuthModule {}
