import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { getJwtSecret } from './jwt-module-options';
import { mergePermissionsFromRoles, premiumEffective } from './permissions.util';

export type JwtPayload = {
  sub: string;
  email: string;
  roles: string[];
  isPremium: boolean;
  permissions: string[];
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private users: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  /** Altijd verse rollen, permissies en premium uit de database (JWT alleen voor sub). */
  async validate(payload: { sub: string }) {
    const user = await this.users.findById(payload.sub);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException();
    }
    const roleSlugs = user.roles.map((r) => r.role.slug);
    const permissions = mergePermissionsFromRoles(user.roles.map((r) => r.role));
    return {
      sub: user.id,
      email: user.email,
      roles: roleSlugs,
      isPremium: premiumEffective(user),
      permissions,
    } satisfies JwtPayload;
  }
}
