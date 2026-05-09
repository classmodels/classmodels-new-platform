import type { JwtModuleOptions } from '@nestjs/jwt';

const DEV_SECRET_FALLBACK = 'dev-secret-change-in-production-min-32';

export function getJwtSecret(): string {
  return (process.env.JWT_SECRET || '').trim() || DEV_SECRET_FALLBACK;
}

/** Leest env bij factory-aanroep; lege `JWT_EXPIRES_IN` zou anders `jwt.sign` doen crashen. */
export function createJwtModuleOptions(): JwtModuleOptions {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d').trim() || '7d';
  return {
    secret: getJwtSecret(),
    signOptions: { expiresIn },
  };
}
