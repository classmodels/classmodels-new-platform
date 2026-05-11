import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { AdminTestshootController } from './admin-testshoot.controller';
import { GuestTestshootController } from './guest-testshoot.controller';
import { TestshootService } from './testshoot.service';

@Module({
  imports: [MediaModule, AuthModule],
  controllers: [GuestTestshootController, AdminTestshootController],
  providers: [TestshootService],
})
export class TestshootModule {}
