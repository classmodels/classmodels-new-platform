import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminSubscriptionsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Permissions('admin.subscriptions.read')
  list() {
    return this.prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }
}
