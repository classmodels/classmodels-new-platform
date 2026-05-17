import type { PrismaService } from '../prisma/prisma.service';

export type ResolvedSmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass: string;
  from: string;
  source: 'database' | 'env';
};

/**
 * SMTP voor de hele site: rij `SiteSmtpSettings` (id=1) wint als `smtpHost` gezet is,
 * anders omgevingsvariabelen `SMTP_*` / `MAIL_FROM` (zoals Combell pipeline-.env).
 */
export async function resolveSmtpConfig(prisma: PrismaService): Promise<ResolvedSmtpConfig | null> {
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
  if (dbHost && row) {
    const port = row.smtpPort && row.smtpPort > 0 ? row.smtpPort : 587;
    const secure = row.smtpSecure === true || port === 465;
    return {
      host: dbHost,
      port,
      secure,
      user: row.smtpUser?.trim() || undefined,
      pass: row.smtpPass ?? '',
      from:
        row.mailFrom?.trim() ||
        process.env.MAIL_FROM?.trim() ||
        'Class Models <noreply@class-models.be>',
      source: 'database',
    };
  }

  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;
  const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === '1' || port === 465,
    user: process.env.SMTP_USER?.trim() || undefined,
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.MAIL_FROM?.trim() || 'Class Models <noreply@classmodels.be>',
    source: 'env',
  };
}
