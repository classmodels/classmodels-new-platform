import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import type { Role, User, UserRole } from '@prisma/client';
import { sendHtmlMail } from '../mail/send-html-mail';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService, pickPublicMediaKey } from '../users/users.service';
import { mergePermissionsFromRoles, premiumEffective } from './permissions.util';
import { normalizeEmail } from './login-identifier.util';

type UserWithRoles = User & {
  roles: (UserRole & { role: Role })[];
  profilePhoto?: {
    storageKey: string;
    webpKey?: string | null;
    thumbKey?: string | null;
    mimeType: string;
  } | null;
};

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);

  constructor(
    private users: UsersService,
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  private async buildAuthResponse(user: UserWithRoles) {
    const roleSlugs = user.roles.map((r) => r.role.slug);
    const permissions = mergePermissionsFromRoles(user.roles.map((r) => r.role));
    const premiumActive = premiumEffective(user);
    const payload = {
      sub: user.id,
      email: user.email,
      roles: roleSlugs,
      isPremium: premiumActive,
      permissions,
    };
    return {
      access_token: await this.jwt.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        bio: user.bio,
        companyName: user.companyName,
        defaultPortal: user.defaultPortal,
        modelSheet: user.modelSheet ?? null,
        profilePhotoAssetId: user.profilePhotoAssetId ?? null,
        profileThumbKey: pickPublicMediaKey(user.profilePhoto ?? null),
        roles: roleSlugs,
        isPremium: premiumActive,
        premiumUntil: user.premiumUntil?.toISOString() ?? null,
        permissions,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async login(identifier: string, password: string) {
    const user = await this.users.findByLoginIdentifierWithRoles(identifier);
    if (!user) throw new UnauthorizedException('Ongeldige gegevens');
    if (user.status !== 'active') {
      throw new UnauthorizedException('Account niet actief');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Ongeldige gegevens');
    await this.users.recordLastLogin(user.id);
    const fresh = await this.users.findById(user.id);
    if (!fresh) throw new UnauthorizedException('Ongeldige gegevens');
    return this.buildAuthResponse(fresh as UserWithRoles);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Huidig wachtwoord is onjuist');
    if (currentPassword === newPassword) {
      throw new BadRequestException('Kies een ander wachtwoord dan het huidige.');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
    const fresh = await this.users.findById(userId);
    if (!fresh) throw new UnauthorizedException();
    return this.buildAuthResponse(fresh as UserWithRoles);
  }

  /** Altijd hetzelfde antwoord (geen account-enumeratie). */
  async forgotPassword(identifier: string) {
    const generic = {
      ok: true,
      message:
        'Als er een account bij dit e-mailadres of telefoonnummer hoort, ontvang je een e-mail met instructies.',
    };
    const user = await this.users.findByLoginIdentifierWithRoles(identifier);
    if (!user?.email) return generic;

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const appUrl = (process.env.WEB_PUBLIC_URL || process.env.WEB_APP_URL || 'https://www.class-models.be').replace(
      /\/$/,
      '',
    );
    const link = `${appUrl}/reset-password?token=${rawToken}`;
    const html = `
      <p>Hallo${user.firstName ? ` ${user.firstName}` : ''},</p>
      <p>Je vroeg een nieuw wachtwoord aan voor Class Models.</p>
      <p><a href="${link}">Klik hier om een nieuw wachtwoord te kiezen</a> (geldig 1 uur).</p>
      <p>Werkt de link niet? Kopieer: ${link}</p>
      <p>Heb je dit niet aangevraagd? Negeer deze mail.</p>
    `;
    const sent = await sendHtmlMail(user.email, 'Nieuw wachtwoord — Class Models', html);
    if (!sent) {
      this.log.warn(`Wachtwoord-reset niet gemaild (SMTP?): ${user.email}`);
    }
    return generic;
  }

  async resetPasswordWithToken(token: string, newPassword: string) {
    const tokenHash = createHash('sha256').update(token.trim()).digest('hex');
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            roles: { include: { role: true } },
          },
        },
      },
    });
    if (!row || row.expiresAt < new Date()) {
      throw new BadRequestException('Deze link is ongeldig of verlopen. Vraag opnieuw een reset aan.');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash, mustChangePassword: false },
      }),
      this.prisma.passwordResetToken.delete({ where: { id: row.id } }),
    ]);
    return this.buildAuthResponse(row.user as UserWithRoles);
  }

  /** Admin: zelfde tijdelijk wachtwoord voor iedereen (behalve exclude). */
  async applySharedTemporaryPassword(password: string, excludeEmail?: string) {
    const hash = await bcrypt.hash(password, 10);
    const exclude = normalizeEmail(excludeEmail || 'admin@class-models.local');
    const result = await this.prisma.user.updateMany({
      where: { email: { not: exclude } },
      data: { passwordHash: hash, mustChangePassword: true },
    });
    return { ok: true, updated: result.count, excludeEmail: exclude };
  }

  async register(params: {
    role: 'model' | 'client';
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    companyName?: string;
  }) {
    const email = params.email.toLowerCase().trim();
    const firstName = params.firstName?.trim() || null;
    const lastName = params.lastName?.trim() || null;
    const phone = params.phone?.trim() || null;
    const companyName = params.companyName?.trim() || null;
    if (params.role === 'model') {
      if (!firstName || !lastName) {
        throw new BadRequestException('Voornaam en familienaam zijn verplicht voor een modellenaccount.');
      }
    } else {
      if (!companyName) {
        throw new BadRequestException('Bedrijfsnaam is verplicht voor een klantenaccount.');
      }
    }
    const hash = await bcrypt.hash(params.password, 10);
    const user = await this.users.createRegisteredUser({
      email,
      passwordHash: hash,
      roleSlug: params.role,
      firstName,
      lastName,
      phone,
      companyName,
    });
    return this.buildAuthResponse(user);
  }

  /** Admin: tijdelijk JWT voor een modellenaccount (zelfde rechten als dat model). */
  async impersonateModel(adminId: string, targetUserId: string) {
    if (adminId === targetUserId) {
      throw new BadRequestException('Je kunt jezelf niet impersoneren.');
    }
    const admin = await this.users.findById(adminId);
    if (!admin) throw new UnauthorizedException();
    const adminPerms = mergePermissionsFromRoles(admin.roles.map((r) => r.role));
    if (!adminPerms.includes('*') && !adminPerms.includes('admin.users.write')) {
      throw new ForbiddenException();
    }

    const target = await this.users.findById(targetUserId);
    if (!target || target.status !== 'active') {
      throw new BadRequestException('Model niet gevonden of niet actief.');
    }
    const modelSlugs = new Set(['model', 'newface', 'tryout', 'inactief']);
    const hasModelRole = target.roles.some((r) => modelSlugs.has(r.role.slug));
    if (!hasModelRole) {
      throw new BadRequestException('Alleen modellenaccounts kunnen worden overgenomen.');
    }

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'admin.impersonate',
        meta: {
          targetUserId: target.id,
          targetEmail: target.email,
        } as object,
      },
    });

    const base = await this.buildAuthResponse(target as UserWithRoles);
    return {
      ...base,
      impersonation: {
        fromAdminId: admin.id,
        fromAdminEmail: admin.email,
      },
    };
  }
}
