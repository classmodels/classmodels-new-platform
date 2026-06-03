import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsBoolean } from 'class-validator';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { PluginsService } from './plugins.service';

class ToggleDto {
  @IsBoolean()
  enabled!: boolean;
}

@Controller('admin/snippets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminPluginsController {
  constructor(private plugins: PluginsService) {}

  @Get()
  @Permissions('admin.snippets.read')
  list() {
    return this.plugins.list();
  }

  @Post('upload')
  @Permissions('admin.snippets.write')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.plugins.upload(file);
  }

  @Patch(':id')
  @Permissions('admin.snippets.write')
  toggle(@Param('id', ParseUUIDPipe) id: string, @Body() body: ToggleDto) {
    return this.plugins.setEnabled(id, Boolean(body.enabled));
  }

  @Delete(':id')
  @Permissions('admin.snippets.write')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.plugins.remove(id);
  }
}
