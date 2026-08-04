import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PartnersService } from './partners.service';
import { PartnersPublicController } from './partners-public.controller';
import { AdminPartnersController } from './admin-partners.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PartnersPublicController, AdminPartnersController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
