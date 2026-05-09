import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateRoleDto } from './dto/admin-role.dto';

@Injectable()
export class AdminRolesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.role.findMany({
      orderBy: { slug: 'asc' },
      include: { _count: { select: { users: true } } },
    });
  }

  async update(id: string, dto: UpdateRoleDto) {
    const r = await this.prisma.role.findUnique({ where: { id } });
    if (!r) throw new NotFoundException();
    return this.prisma.role.update({
      where: { id },
      data: {
        ...(dto.label != null ? { label: dto.label } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.permissions != null ? { permissions: dto.permissions as object } : {}),
      },
    });
  }
}
