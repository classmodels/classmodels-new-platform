import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AgendaModule } from '../agenda/agenda.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminBulkCommsController } from './admin-bulk-comms.controller';
import { BulkCommsPublicController } from './bulk-comms-public.controller';
import { BulkCommsService } from './bulk-comms.service';

@Module({
  imports: [PrismaModule, AuthModule, AgendaModule],
  controllers: [AdminBulkCommsController, BulkCommsPublicController],
  providers: [BulkCommsService],
})
export class BulkCommsModule {}
