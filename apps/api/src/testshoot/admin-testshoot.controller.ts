import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { TestshootService } from './testshoot.service';
import { CreateTestshootModelDto, RenameTestshootModelDto } from './dto/admin-testshoot.dto';

@Controller('admin/testshoot')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminTestshootController {
  constructor(private readonly testshoot: TestshootService) {}

  @Get('models')
  @Permissions('admin.testshoot.read')
  list() {
    return this.testshoot.adminList();
  }

  @Get('models/:id')
  @Permissions('admin.testshoot.read')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.testshoot.adminModelDetail(id);
  }

  @Post('models')
  @Permissions('admin.testshoot.write')
  create(@Body() body: CreateTestshootModelDto) {
    return this.testshoot.adminCreateModel(body.name);
  }

  @Patch('models/:id')
  @Permissions('admin.testshoot.write')
  rename(@Param('id', ParseUUIDPipe) id: string, @Body() body: RenameTestshootModelDto) {
    return this.testshoot.adminRename(id, body.name);
  }

  @Post('models/:id/photos')
  @Permissions('admin.testshoot.write')
  @UseInterceptors(
    FilesInterceptor('files', 40, {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  addPhotos(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: { user: JwtPayload },
  ) {
    if (!files?.length) throw new BadRequestException('Geen bestanden');
    return this.testshoot.adminAddPhotos(id, files, req.user.sub);
  }

  @Delete('models/:id/photos')
  @Permissions('admin.testshoot.write')
  clearPhotos(@Param('id', ParseUUIDPipe) id: string) {
    return this.testshoot.adminClearPhotos(id);
  }

  @Delete('models/:id')
  @Permissions('admin.testshoot.write')
  archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.testshoot.adminArchiveModel(id);
  }

  @Get('models/:id/feedbacks')
  @Permissions('admin.testshoot.read')
  feedbacks(@Param('id', ParseUUIDPipe) id: string) {
    return this.testshoot.adminListFeedback(id);
  }

  @Delete('feedbacks/:feedbackId')
  @Permissions('admin.testshoot.write')
  deleteFeedback(@Param('feedbackId', ParseUUIDPipe) feedbackId: string) {
    return this.testshoot.adminDeleteFeedback(feedbackId);
  }
}
