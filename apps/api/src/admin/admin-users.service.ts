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
import { CatalogService } from '../catalog/catalog.service';
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
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  roles: {
    include: {
      role: {
        select: {
          id: true,
          slug: true,
          label: true,
          description: true,
          permissions: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  },
  modelSheet: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class AdminUsersService {
  constructor(
    private prisma: PrismaService,
    private media: MediaService,
    private catalog: CatalogService,
  ) {}

  list() {
    return this.prisma.user.findMany({
      select: userPublicSelect,
      /** Meest recent ingelogd bovenaan; accounts zonder login onderaan. */
      orderBy: { lastLoginAt: 'desc' },
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
      this.catalog.invalidateListCache();
    }

    return this.get(id);
  }

  /** Zet in prullenbak (rol verwijderd). `permanent` wist echt, inclusief foto’s. */
  async deleteUser(actorUserId: string, targetUserId: string, permanent = false) {
    if (actorUserId === targetUserId) {
      throw new ForbiddenException('Je eigen account kun je hier niet verwijderen.');
    }
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        profilePhotoAssetId: true,
        roles: { select: { role: { select: { slug: true } } } },
      },
    });
    if (!target) throw new NotFoundException();
    const slugs = target.roles.map((r) => r.role.slug);
    if (!permanent && !slugs.includes('verwijderd')) {
      const trash = await this.ensureVerwijderdRole();
      await this.prisma.userRole.createMany({
        data: [{ userId: targetUserId, roleId: trash.id }],
        skipDuplicates: true,
      });
      await this.prisma.user.update({
        where: { id: targetUserId },
        data: { status: 'suspended' },
      });
      this.catalog.invalidateListCache();
      return { ok: true, id: targetUserId, trashed: true };
    }

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
    this.catalog.invalidateListCache();
    return { ok: true, id: targetUserId, trashed: false };
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

  /** Voegt een rol toe zonder bestaande rollen te verwijderen. */
  async bulkAddRoles(userIds: string[], roleSlug: string) {
    const slug = String(roleSlug || '').trim();
    if (!slug) throw new ConflictException('Kies een rol.');
    const accountSlugs = new Set(['admin', 'client', 'guest', 'fotograaf']);
    if (accountSlugs.has(slug)) {
      throw new ForbiddenException('Dit is geen modelgroepering.');
    }
    const role = await this.prisma.role.findUnique({ where: { slug } });
    if (!role) throw new NotFoundException('Onbekende rol.');
    const uniq = [...new Set(userIds)].filter(Boolean);
    if (!uniq.length) throw new ConflictException('Selecteer minstens één gebruiker.');

    const users = await this.prisma.user.findMany({
      where: { id: { in: uniq } },
      select: {
        id: true,
        defaultPortal: true,
        roles: { select: { role: { select: { slug: true } } } },
      },
    });
    const eligibleIds = users
      .filter((u) => {
        if (u.defaultPortal === 'model') return true;
        return u.roles.some((r) => !accountSlugs.has(r.role.slug));
      })
      .map((u) => u.id);
    const skipped = uniq.length - eligibleIds.length;
    if (!eligibleIds.length) {
      throw new ConflictException('Geen modellen in de selectie. Filter eerst op Model.');
    }

    const existing = await this.prisma.userRole.findMany({
      where: { userId: { in: eligibleIds }, roleId: role.id },
      select: { userId: true },
    });
    const already = new Set(existing.map((r) => r.userId));
    const toAdd = eligibleIds.filter((id) => !already.has(id));
    if (toAdd.length) {
      await this.prisma.userRole.createMany({
        data: toAdd.map((userId) => ({ userId, roleId: role.id })),
        skipDuplicates: true,
      });
      this.catalog.invalidateListCache();
    }
    return {
      roleSlug: slug,
      label: role.label,
      added: toAdd.length,
      alreadyHad: already.size,
      skipped,
      selected: uniq.length,
    };
  }

  async bulkMoveRoles(userIds: string[], toSlug: string, fromSlugs?: string[]) {
    const to = String(toSlug || '').trim();
    const accountSlugs = new Set(['admin', 'client', 'guest', 'fotograaf']);
    if (!to || accountSlugs.has(to) || to === 'model') {
      throw new ForbiddenException('Dit is geen modelgroepering.');
    }
    const dest = await this.prisma.role.findUnique({ where: { slug: to } });
    if (!dest) throw new NotFoundException('Onbekende doelgroep.');
    const added = await this.bulkAddRoles(userIds, to);
    const from = [...new Set((fromSlugs ?? []).map((s) => String(s || '').trim()).filter(Boolean))].filter(
      (s) => s !== to && !accountSlugs.has(s) && s !== 'model' && s !== 'verwijderd',
    );
    let removed = 0;
    if (from.length) {
      const fromRoles = await this.prisma.role.findMany({ where: { slug: { in: from } } });
      if (fromRoles.length) {
        const uniq = [...new Set(userIds)].filter(Boolean);
        const res = await this.prisma.userRole.deleteMany({
          where: {
            userId: { in: uniq },
            roleId: { in: fromRoles.map((r) => r.id) },
          },
        });
        removed = res.count;
        this.catalog.invalidateListCache();
      }
    }
    return { ...added, toSlug: to, removed, fromSlugs: from };
  }

  private async ensureVerwijderdRole() {
    const existing = await this.prisma.role.findUnique({ where: { slug: 'verwijderd' } });
    if (existing) return existing;
    return this.prisma.role.create({
      data: {
        slug: 'verwijderd',
        label: 'Verwijderd',
        description: 'Prullenbak: terugzetten of de map leegmaken (definitief wissen).',
        permissions: [],
        catalogVisibility: 'admin_frontend',
      },
    });
  }

  async restoreUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException();
    const role = await this.prisma.role.findUnique({ where: { slug: 'verwijderd' } });
    if (role) {
      await this.prisma.userRole.deleteMany({ where: { userId, roleId: role.id } });
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'active' },
    });
    this.catalog.invalidateListCache();
    return this.get(userId);
  }

  async emptyTrash(actorUserId: string) {
    const role = await this.ensureVerwijderdRole();
    const rows = await this.prisma.userRole.findMany({
      where: { roleId: role.id },
      select: { userId: true },
    });
    const deleted: string[] = [];
    const errors: { id: string; message: string }[] = [];
    for (const row of rows) {
      try {
        await this.deleteUser(actorUserId, row.userId, true);
        deleted.push(row.userId);
      } catch (e) {
        errors.push({
          id: row.userId,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return { deleted, errors };
  }

  /** Aan/uit van één modelgroepering, zonder andere rollen te wissen. */
  async toggleGroupingRole(userId: string, roleSlug: string, enabled: boolean) {
    const slug = String(roleSlug || '').trim();
    const accountSlugs = new Set(['admin', 'client', 'guest', 'fotograaf']);
    if (!slug || accountSlugs.has(slug) || slug === 'model') {
      throw new ForbiddenException('Dit is geen modelgroepering.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException();
    const role = await this.prisma.role.findUnique({ where: { slug } });
    if (!role) throw new NotFoundException('Onbekende rol.');
    if (enabled) {
      await this.prisma.userRole.createMany({
        data: [{ userId, roleId: role.id }],
        skipDuplicates: true,
      });
    } else {
      await this.prisma.userRole.deleteMany({ where: { userId, roleId: role.id } });
    }
    if (slug === 'verwijderd') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: enabled ? 'suspended' : 'active' },
      });
    }
    this.catalog.invalidateListCache();
    const fresh = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roles: { select: { role: { select: { slug: true } } } } },
    });
    const slugs = (fresh?.roles ?? []).map((r) => r.role.slug);
    return {
      id: userId,
      roleSlugs: slugs,
      isNewface: slugs.includes('newface'),
      isTryout: slugs.includes('tryout'),
      isHighClass: slugs.includes('high-class'),
      isInactive: slugs.includes('inactief'),
      isDeleted: slugs.includes('verwijderd'),
    };
  }
}
