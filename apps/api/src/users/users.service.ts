import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PatchProfileDto } from './dto/patch-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmailWithRoles(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { roles: { include: { role: true } } },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
  }

  async patchProfile(userId: string, dto: PatchProfileDto) {
    const data: Record<string, unknown> = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName || null;
    if (dto.lastName !== undefined) data.lastName = dto.lastName || null;
    if (dto.phone !== undefined) data.phone = dto.phone || null;
    if (dto.bio !== undefined) data.bio = dto.bio || null;
    if (dto.companyName !== undefined) data.companyName = dto.companyName || null;
    return this.prisma.user.update({
      where: { id: userId },
      data: data as never,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        bio: true,
        companyName: true,
        defaultPortal: true,
      },
    });
  }
}
