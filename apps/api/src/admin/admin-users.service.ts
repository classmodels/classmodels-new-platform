import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { CreateAdminUserDto, UpdateAdminUserDto } from './dto/admin-user.dto';
import { sanitizeModelSheetMerge } from '../users/model-sheet.util';

const userPublicSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  bio: true,
  companyName: true,
  status: true,
  defaultPortal: true,
  isPremium: true,
  premiumUntil: true,
  mollieCustomerId: true,
  legacyWpUserId: true,
  createdAt: true,
  updatedAt: true,
  roles: { include: { role: true } },
  modelSheet: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class AdminUsersService {
  constructor(
    private prisma: PrismaService,
    private media: MediaService,
  ) {}

  list() {
    return this.prisma.user.findMany({
      select: userPublicSelect,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async get(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });
    if (!u) throw new NotFoundException();
    return u;
  }

  async create(dto: CreateAdminUserDto) {
    const email = dto.email.toLowerCase().trim();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('E-mail bestaat al');
    const hash = await bcrypt.hash(dto.password, 10);
    const roles = await this.prisma.role.findMany({
      where: { slug: { in: dto.roleSlugs } },
    });
    if (roles.length !== dto.roleSlugs.length) {
      throw new ConflictException('Onbekende rol(s) in roleSlugs');
    }
    return this.prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: dto.status ?? 'active',
        defaultPortal: dto.defaultPortal,
        roles: {
          create: roles.map((r) => ({ role: { connect: { id: r.id } } })),
        },
      },
      select: userPublicSelect,
    });
  }

  async update(id: string, dto: UpdateAdminUserDto) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException();
    if (dto.email && dto.email.toLowerCase().trim() !== u.email) {
      const clash = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase().trim() },
      });
      if (clash) throw new ConflictException('E-mail bestaat al');
    }
    const data: Record<string, unknown> = {};
    if (dto.email != null) data.email = dto.email.toLowerCase().trim();
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.status != null) data.status = dto.status;
    if (dto.defaultPortal !== undefined) data.defaultPortal = dto.defaultPortal;
    if (dto.isPremium !== undefined) data.isPremium = dto.isPremium;
    if (dto.premiumUntil !== undefined) {
      data.premiumUntil = dto.premiumUntil ? new Date(dto.premiumUntil) : null;
    }
    if (dto.phone !== undefined) data.phone = dto.phone || null;
    if (dto.bio !== undefined) data.bio = dto.bio || null;
    if (dto.companyName !== undefined) data.companyName = dto.companyName || null;
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    if (dto.modelSheet !== undefined) {
      const cur = await this.prisma.user.findUnique({
        where: { id },
        select: { modelSheet: true },
      });
      data.modelSheet = sanitizeModelSheetMerge(cur?.modelSheet ?? null, dto.modelSheet);
    }

    await this.prisma.user.update({ where: { id }, data: data as never });

    if (dto.roleSlugs) {
      const roles = await this.prisma.role.findMany({
        where: { slug: { in: dto.roleSlugs } },
      });
      if (roles.length !== dto.roleSlugs.length) {
        throw new ConflictException('Onbekende rol(s)');
      }
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      await this.prisma.userRole.createMany({
        data: roles.map((r) => ({ userId: id, roleId: r.id })),
      });
    }

    return this.get(id);
  }

  /** Verwijdert gebruiker + eigen media (schijf + DB). Gebruikt niet in transaction zodat removeAsset bestanden veilig opruimt. */
  async deleteUser(actorUserId: string, targetUserId: string) {
    if (actorUserId === targetUserId) {
      throw new ForbiddenException('Je eigen account kun je hier niet verwijderen.');
    }
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, profilePhotoAssetId: true },
    });
    if (!target) throw new NotFoundException();

    await this.prisma.contentString.updateMany({
      where: { updatedById: targetUserId },
      data: { updatedById: null },
    });
    await this.prisma.auditLog.updateMany({
      where: { userId: targetUserId },
      data: { userId: null },
    });

    const uploads = await this.prisma.mediaAsset.findMany({
      where: { uploadedById: targetUserId },
      select: { id: true },
    });
    const assetIds = new Set<string>();
    for (const u of uploads) assetIds.add(u.id);
    if (target.profilePhotoAssetId) assetIds.add(target.profilePhotoAssetId);

    for (const aid of assetIds) {
      try {
        await this.media.removeAsset(aid, true);
      } catch {
        /* best-effort: bij corrupte refs verder gaan */
      }
    }

    await this.prisma.user.delete({ where: { id: targetUserId } });
    return { ok: true, id: targetUserId };
  }

  async deleteUsers(actorUserId: string, ids: string[]) {
    const uniq = [...new Set(ids)].filter((id) => id && id !== actorUserId);
    const deleted: string[] = [];
    const errors: { id: string; message: string }[] = [];
    for (const id of uniq) {
      try {
        await this.deleteUser(actorUserId, id);
        deleted.push(id);
      } catch (e) {
        errors.push({
          id,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return { deleted, errors };
  }
}
