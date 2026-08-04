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
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { PartnersService } from './partners.service';

@Controller('admin/partners')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminPartnersController {
  constructor(private partners: PartnersService) {}

  @Get()
  @Permissions('admin.partners.read')
  list() {
    return this.partners.listAdmin();
  }

  @Post()
  @Permissions('admin.partners.write')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async create(
    @Body()
    body: {
      name?: string;
      websiteUrl?: string;
      imagePath?: string;
      sortOrder?: string | number;
      visible?: string | boolean;
    },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const name = (body.name || '').trim();
    if (!name) return { error: 'Naam is verplicht' };
    let imagePath = (body.imagePath || '').trim();
    if (file) imagePath = this.partners.saveUploadedLogo(file);
    if (!imagePath) return { error: 'Logo-bestand of imagePath is verplicht' };
    return this.partners.create({
      name,
      websiteUrl: body.websiteUrl,
      imagePath,
      sortOrder: body.sortOrder != null ? Number(body.sortOrder) : 0,
      visible: parseBool(body.visible, true),
    });
  }

  @Patch(':id')
  @Permissions('admin.partners.write')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      name?: string;
      websiteUrl?: string;
      imagePath?: string;
      sortOrder?: string | number;
      visible?: string | boolean;
    },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const patch: {
      name?: string;
      websiteUrl?: string | null;
      imagePath?: string;
      sortOrder?: number;
      visible?: boolean;
    } = {};
    if (body.name != null) patch.name = body.name;
    if (body.websiteUrl !== undefined) patch.websiteUrl = body.websiteUrl || null;
    if (body.imagePath != null) patch.imagePath = body.imagePath;
    if (body.sortOrder != null) patch.sortOrder = Number(body.sortOrder);
    if (body.visible !== undefined) patch.visible = parseBool(body.visible, true);
    if (file) patch.imagePath = this.partners.saveUploadedLogo(file);
    return this.partners.update(id, patch);
  }

  @Delete(':id')
  @Permissions('admin.partners.write')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.partners.remove(id);
  }
}

function parseBool(v: string | boolean | undefined, fallback: boolean): boolean {
  if (v === undefined) return fallback;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase();
  if (s === 'true' || s === '1') return true;
  if (s === 'false' || s === '0') return false;
  return fallback;
}
