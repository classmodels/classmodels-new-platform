import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminPluginsController } from './admin-plugins.controller';
import { PluginHooksService } from './plugin-hooks.service';
import { PluginRuntimeService } from './plugin-runtime.service';
import { PluginsPublicController } from './plugins-public.controller';
import { PluginsService } from './plugins.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminPluginsController, PluginsPublicController],
  providers: [PluginsService, PluginHooksService, PluginRuntimeService],
  exports: [PluginRuntimeService, PluginHooksService],
})
export class PluginsModule {}
