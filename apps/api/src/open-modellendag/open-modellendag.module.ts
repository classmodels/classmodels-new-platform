import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OpenModellendagService } from './open-modellendag.service';
import { OpenModellendagController } from './open-modellendag.controller';
import { AdminOpenModellendagController } from './admin-open-modellendag.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [OpenModellendagController, AdminOpenModellendagController],
  providers: [OpenModellendagService],
})
export class OpenModellendagModule {}
