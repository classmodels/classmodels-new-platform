import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { createJwtModuleOptions } from '../auth/jwt-module-options';
import { MenusService } from './menus.service';
import { MenusPublicController } from './menus-public.controller';
import { AdminMenusController } from '../admin/admin-menus.controller';

@Module({
  imports: [
    AuthModule,
    JwtModule.registerAsync({
      useFactory: () => createJwtModuleOptions(),
    }),
  ],
  controllers: [MenusPublicController, AdminMenusController],
  providers: [MenusService],
  exports: [MenusService],
})
export class MenusModule {}
