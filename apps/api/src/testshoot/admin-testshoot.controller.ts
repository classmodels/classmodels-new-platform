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
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { TestshootService } from './testshoot.service';
import { CreateTestshootModelDto, RenameTestshootModelDto } from './dto/admin-testshoot.dto';
import { BulkPermanentDeleteDto } from './dto/bulk-permanent-delete.dto';
import { BulkIdsDto, BulkMailDto } from './dto/bulk-ids.dto';

@Controller('admin/testshoot')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminTestshootController {
  constructor(private readonly testshoot: TestshootService) {}

  /** Alle feedbackdocumenten (virtuele map: documenten → gratis fotoshoot). */
  @Get('feedbacks')
  @Permissions('admin.testshoot.read')
  listAllFeedbacks() {
    return this.testshoot.adminListAllFeedbacks();
  }

  @Post('feedbacks/print-html')
  @Permissions('admin.testshoot.read')
  async printHtml(@Body() body: BulkIdsDto) {
    const html = await this.testshoot.buildFeedbackDocumentsHtml(body.ids);
    return { html };
  }

  @Post('feedbacks/bulk-mail')
  @Permissions('admin.testshoot.write')
  bulkMail(@Body() body: BulkMailDto) {
    return this.testshoot.adminBulkMailFeedbacks(body.ids, body.to);
  }

  @Get('models')
  @Permissions('admin.testshoot.read')
  list() {
    return this.testshoot.adminList();
  }

  /** Definitief verwijderen (één slot) — vóór `models/:id` zou “permanent” als id matchen; daarom expliciet pad. */
  @Delete('models/:id/permanent')
  @Permissions('admin.testshoot.write')
  permanentOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.testshoot.adminPermanentDeleteByIds([id]);
  }

  @Post('models/bulk-permanent-delete')
  @Permissions('admin.testshoot.write')
  bulkPermanent(@Body() body: BulkPermanentDeleteDto) {
    return this.testshoot.adminPermanentDeleteByIds(body.ids);
  }

  @Get('models/:id/zip')
  @Permissions('admin.testshoot.read')
  async downloadZip(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    await this.testshoot.adminStreamZipToResponse(id, res);
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
