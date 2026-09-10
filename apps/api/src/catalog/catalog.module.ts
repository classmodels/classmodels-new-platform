import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { createJwtModuleOptions } from '../auth/jwt-module-options';
import { PrismaModule } from '../prisma/prisma.module';
import { MediaModule } from '../media/media.module';
import { AgendaModule } from '../agenda/agenda.module';
import { CatalogService } from './catalog.service';
import { CatalogPublicController } from './catalog-public.controller';
import { CatalogAdminController } from './catalog-admin.controller';

@Module({
  imports: [PrismaModule, MediaModule, AgendaModule, JwtModule.register(createJwtModuleOptions())],
  controllers: [CatalogPublicController, CatalogAdminController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
