import type { PrismaService } from '../prisma/prisma.service';

export type ResolvedSmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass: string;
  from: string;
  source: 'database' | 'env' | 'database+env';
};

function smtpFromEnv(): ResolvedSmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;
  const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 587,
    secure: process.env.SMTP_SECURE === '1' || port === 465,
    user: process.env.SMTP_USER?.trim() || undefined,
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.MAIL_FROM?.trim() || 'Class Models <noreply@class-models.be>',
    source: 'env',
  };
}

/**
 * SMTP voor de hele site.
 * - `SMTP_FORCE_ENV=1`: altijd process.env (debug / Combell pipeline-.env).
 * - Anders: DB-host wint, maar ontbrekend wachtwoord/user/from vult aan uit env.
 * - Geen geldige DB-host: volledig env.
 */
export async function resolveSmtpConfig(prisma: PrismaService): Promise<ResolvedSmtpConfig | null> {
  if (process.env.SMTP_FORCE_ENV === '1') {
    return smtpFromEnv();
  }

  const envCfg = smtpFromEnv();

  let row: {
    smtpHost: string | null;
    smtpPort: number | null;
    smtpSecure: boolean;
    smtpUser: string | null;
    smtpPass: string | null;
    mailFrom: string | null;
  } | null = null;
  try {
    row = await prisma.siteSmtpSettings.findUnique({
      where: { id: 1 },
      select: {
        smtpHost: true,
        smtpPort: true,
        smtpSecure: true,
        smtpUser: true,
        smtpPass: true,
        mailFrom: true,
      },
    });
  } catch {
    row = null;
  }

  const dbHost = row?.smtpHost?.trim();
  if (!dbHost) {
    return envCfg;
  }

  const dbPass = (row?.smtpPass ?? '').trim();
  const dbUser = row?.smtpUser?.trim() || undefined;
  const port =
    row?.smtpPort && row.smtpPort > 0 ? row.smtpPort : (envCfg?.port ?? 587);
  const secure = row?.smtpSecure === true || port === 465;

  // DB-host zonder wachtwoord terwijl env wél credentials heeft → env (voorkomt stille mislukking).
  if (!dbPass && envCfg?.pass) {
    return {
      ...envCfg,
      from:
        row?.mailFrom?.trim() ||
        envCfg.from ||
        'Class Models <noreply@class-models.be>',
      source: 'database+env',
    };
  }

  // DB-host zonder enige auth en env heeft host → env
  if (!dbPass && !dbUser && envCfg) {
    return envCfg;
  }

  const mergedUser = dbUser || envCfg?.user;
  const mergedPass = dbPass || envCfg?.pass || '';
  const mergedFrom =
    row?.mailFrom?.trim() ||
    envCfg?.from ||
    'Class Models <noreply@class-models.be>';

  return {
    host: dbHost,
    port,
    secure,
    user: mergedUser,
    pass: mergedPass,
    from: mergedFrom,
    source: dbPass ? 'database' : envCfg ? 'database+env' : 'database',
  };
}

export function smtpTransportOptions(cfg: ResolvedSmtpConfig): {
  host: string;
  port: number;
  secure: boolean;
  auth?: { user: string; pass: string };
  connectionTimeout: number;
  greetingTimeout: number;
  socketTimeout: number;
} {
  const timeoutMs = Math.max(
    5000,
    parseInt(process.env.SMTP_CONNECTION_TIMEOUT_MS || '15000', 10) || 15000,
  );
  return {
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    connectionTimeout: timeoutMs,
    greetingTimeout: timeoutMs,
    socketTimeout: timeoutMs,
  };
}
