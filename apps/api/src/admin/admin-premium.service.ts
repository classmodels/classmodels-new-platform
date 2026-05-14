import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { premiumEffective } from '../auth/permissions.util';

const MODEL_ROLE_SLUGS = ['model', 'newface', 'tryout', 'inactief'] as const;

@Injectable()
export class AdminPremiumService {
  constructor(private prisma: PrismaService) {}

  async overview() {
    const users = await this.prisma.user.findMany({
      where: {
        status: 'active',
        roles: { some: { role: { slug: { in: [...MODEL_ROLE_SLUGS] } } } },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isPremium: true,
        premiumUntil: true,
        createdAt: true,
        roles: { select: { role: { select: { slug: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1200,
    });

    const rows = users.map((u) => {
      const roleSlugs = u.roles.map((r) => r.role.slug);
      const active = premiumEffective(u);
      return {
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        isPremium: u.isPremium,
        premiumUntil: u.premiumUntil?.toISOString() ?? null,
        premiumActive: active,
        createdAt: u.createdAt.toISOString(),
        roleSlugs,
      };
    });

    const premiumActiveCount = rows.filter((r) => r.premiumActive).length;
    const nonPremiumCount = rows.length - premiumActiveCount;

    return {
      totalModelAccounts: rows.length,
      premiumActiveCount,
      nonPremiumCount,
      models: rows,
    };
  }
}
