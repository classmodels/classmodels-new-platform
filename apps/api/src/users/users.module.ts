import { Module, forwardRef } from '@nestjs/common';
import { ModelPortalHistoryModule } from '../portal/model-portal-history.module';
import { PushModule } from '../push/push.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [ModelPortalHistoryModule, forwardRef(() => PushModule)],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
