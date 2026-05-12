import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Role, User, UserRole } from '@prisma/client';
import { UsersService, pickPublicMediaKey } from '../users/users.service';
import { mergePermissionsFromRoles, premiumEffective } from './permissions.util';

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
  constructor(
    private users: UsersService,
    private jwt: JwtService,
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
        permissions,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      },
    };
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmailWithRoles(email);
    if (!user) throw new UnauthorizedException('Ongeldige gegevens');
    if (user.status !== 'active') {
      throw new UnauthorizedException('Account niet actief');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Ongeldige gegevens');
    await this.users.recordLastLogin(user.id);
    const fresh = await this.users.findByEmailWithRoles(email);
    if (!fresh) throw new UnauthorizedException('Ongeldige gegevens');
    return this.buildAuthResponse(fresh as UserWithRoles);
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
}
