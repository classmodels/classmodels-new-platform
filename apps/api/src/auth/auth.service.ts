import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { mergePermissionsFromRoles, premiumEffective } from './permissions.util';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findByEmailWithRoles(email);
    if (!user) throw new UnauthorizedException('Ongeldige gegevens');
    if (user.status !== 'active') {
      throw new UnauthorizedException('Account niet actief');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Ongeldige gegevens');
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
        roles: roleSlugs,
        isPremium: premiumActive,
        permissions,
      },
    };
  }
}
