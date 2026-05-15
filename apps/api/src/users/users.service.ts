import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import {
  isEmailLike,
  normalizeEmail,
  phoneDigits,
  phoneLookupVariants,
} from '../auth/login-identifier.util';
import { existsSync } from 'fs';
import { join } from 'path';
import { resolveMediaRoot } from '../config/resolve-media-root';
import { PrismaService } from '../prisma/prisma.service';
import type { PatchProfileDto } from './dto/patch-profile.dto';
import { sanitizeModelSheetMerge } from './model-sheet.util';
import { ModelPortalHistoryService } from '../portal/model-portal-history.service';

function mediaRoot(): string {
  return resolveMediaRoot();
}

export function pickPublicMediaKey(asset: {
  storageKey: string;
  webpKey?: string | null;
  thumbKey?: string | null;
} | null): string | null {
  if (!asset) return null;
  const root = mediaRoot();
  for (const k of [asset.thumbKey, asset.webpKey, asset.storageKey]) {
    if (k && existsSync(join(root, k))) return k;
  }
  return asset.storageKey;
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private modelHistory: ModelPortalHistoryService,
  ) {}

  findByEmailWithRoles(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        roles: { include: { role: true } },
        profilePhoto: {
          select: { storageKey: true, webpKey: true, thumbKey: true, mimeType: true },
        },
      },
    });
  }

  /** Inloggen met e-mail of telefoonnummer. */
  async findByLoginIdentifierWithRoles(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (isEmailLike(trimmed)) {
      return this.findByEmailWithRoles(trimmed);
    }
    const variants = new Set(phoneLookupVariants(trimmed));
    const needle = phoneDigits(trimmed);
    if (needle.length < 8) return null;
    const candidates = await this.prisma.user.findMany({
      where: { phone: { not: null } },
      include: {
        roles: { include: { role: true } },
        profilePhoto: {
          select: { storageKey: true, webpKey: true, thumbKey: true, mimeType: true },
        },
      },
    });
    return (
      candidates.find((u) => {
        if (!u.phone) return false;
        const stored = phoneDigits(u.phone);
        if (!stored) return false;
        if (variants.has(stored)) return true;
        return stored.slice(-9) === needle.slice(-9);
      }) ?? null
    );
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
        profilePhoto: {
          select: { storageKey: true, webpKey: true, thumbKey: true, mimeType: true },
        },
      },
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
    if (!role) {
      throw new BadRequestException(
        'Registratie is nog niet geconfigureerd op de server (ontbrekende rol). Probeer later opnieuw of neem contact op.',
      );
    }
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
      include: {
        roles: { include: { role: true } },
        profilePhoto: {
          select: { storageKey: true, webpKey: true, thumbKey: true, mimeType: true },
        },
      },
    });
  }

  async recordLastLogin(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async patchProfile(userId: string, dto: PatchProfileDto) {
    const before = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        phone: true,
        bio: true,
        companyName: true,
        modelSheet: true,
        profilePhotoAssetId: true,
      },
    });
    if (!before) throw new BadRequestException('Gebruiker niet gevonden');

    const data: Record<string, unknown> = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName || null;
    if (dto.lastName !== undefined) data.lastName = dto.lastName || null;
    if (dto.phone !== undefined) data.phone = dto.phone || null;
    if (dto.bio !== undefined) data.bio = dto.bio || null;
    if (dto.companyName !== undefined) data.companyName = dto.companyName || null;

    if (dto.modelSheet !== undefined) {
      data.modelSheet = sanitizeModelSheetMerge(before.modelSheet ?? null, dto.modelSheet);
    }

    if (dto.profilePhotoAssetId !== undefined) {
      if (dto.profilePhotoAssetId === null) {
        data.profilePhotoAssetId = null;
      } else {
        const asset = await this.prisma.mediaAsset.findFirst({
          where: {
            id: dto.profilePhotoAssetId,
            uploadedById: userId,
            hardDeleted: false,
            folder: { slug: 'models' },
          },
        });
        if (!asset) {
          throw new BadRequestException('Ongeldige profielfoto (eigen upload in map Modellen vereist).');
        }
        data.profilePhotoAssetId = dto.profilePhotoAssetId;
      }
    }

    if (Object.keys(data).length === 0) {
      const row = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          bio: true,
          companyName: true,
          defaultPortal: true,
          modelSheet: true,
        },
      });
      if (!row) throw new BadRequestException('Gebruiker niet gevonden');
      return row;
    }

    const updated = await this.prisma.user.update({
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
        modelSheet: true,
      },
    });
    const labels: string[] = [];
    if (dto.firstName !== undefined) labels.push('Voornaam');
    if (dto.lastName !== undefined) labels.push('Familienaam');
    if (dto.phone !== undefined) labels.push('Telefoon');
    if (dto.bio !== undefined) labels.push('Bio');
    if (dto.companyName !== undefined) labels.push('Bedrijfsnaam');
    if (dto.modelSheet !== undefined) labels.push('Modellenfiche');
    if (dto.profilePhotoAssetId !== undefined) labels.push('Hoofdfoto');
    if (labels.length) {
      void this.modelHistory.log(userId, 'profile_updated', { velden: labels });
    }
    return updated;
  }
}
