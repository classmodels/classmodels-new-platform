import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminAuditController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Permissions('admin.audit.read')
  list(@Query('take') takeRaw?: string) {
    const take = Math.min(parseInt(takeRaw ?? '100', 10) || 100, 500);
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: { user: { select: { id: true, email: true } } },
    });
  }
}
