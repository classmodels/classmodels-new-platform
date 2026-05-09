import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  listStrings() {
    return this.prisma.contentString.findMany({ orderBy: { key: 'asc' } });
  }

  async patchString(key: string, value: string, userId: string) {
    const row = await this.prisma.contentString.findUnique({ where: { key } });
    if (!row) throw new NotFoundException('Onbekende sleutel');
    return this.prisma.contentString.update({
      where: { key },
      data: { value, updatedById: userId },
    });
  }

  async createString(
    key: string,
    value: string,
    userId: string,
    portal?: import('@prisma/client').Portal,
  ) {
    const exists = await this.prisma.contentString.findUnique({ where: { key } });
    if (exists) throw new ConflictException('Sleutel bestaat al');
    return this.prisma.contentString.create({
      data: {
        key,
        value,
        locale: 'nl',
        portal: portal ?? undefined,
        updatedById: userId,
      },
    });
  }

  async removeString(key: string) {
    const row = await this.prisma.contentString.findUnique({ where: { key } });
    if (!row) throw new NotFoundException();
    await this.prisma.contentString.delete({ where: { key } });
    return { ok: true };
  }
}
