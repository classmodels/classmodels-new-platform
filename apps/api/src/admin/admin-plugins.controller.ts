import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/snippets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminPluginsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Permissions('admin.snippets.read')
  list() {
    return this.prisma.pluginSnippet.findMany({ orderBy: { slug: 'asc' } });
  }
}
