import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
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

  /** Publieke registratie alleen voor rollen `model` en `client`. */
  async createRegisteredUser(params: {
    email: string;
    passwordHash: string;
    roleSlug: 'model' | 'client';
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    companyName: string | null;
  }) {
    const email = params.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('E-mail bestaat al');
    const role = await this.prisma.role.findUnique({ where: { slug: params.roleSlug } });
    if (!role) throw new BadRequestException('Registratie is tijdelijk niet beschikbaar.');
    const defaultPortal = params.roleSlug === 'model' ? 'model' : 'client';
    return this.prisma.user.create({
      data: {
        email,
        passwordHash: params.passwordHash,
        firstName: params.firstName,
        lastName: params.lastName,
        phone: params.phone,
        companyName: params.companyName,
        defaultPortal,
        status: 'active',
        roles: { create: [{ role: { connect: { id: role.id } } }] },
      },
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
