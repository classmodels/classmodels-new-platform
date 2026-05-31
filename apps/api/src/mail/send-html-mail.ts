import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { PrismaService } from '../prisma/prisma.service';
import { resolveSmtpConfig } from './mail-smtp-resolve';

const log = new Logger('sendHtmlMail');

function smtpErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

function isSmtpRateOrQuotaError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('rate') ||
    m.includes('quota') ||
    m.includes('too many') ||
    m.includes('421') ||
    m.includes('450') ||
    m.includes('451') ||
    m.includes('452')
  );
}

/** SMTP-mail zonder Nest-module (voorkomt Auth ↔ Agenda circular import). */
export async function sendHtmlMailDetailed(
  prisma: PrismaService,
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; error?: string }> {
  const addr = to?.trim();
  if (!addr) return { ok: false, error: 'Geen e-mailadres' };

  const maxAttempts = parseInt(process.env.SMTP_SEND_MAX_ATTEMPTS || '5', 10) || 5;
  let lastErr = 'SMTP niet geconfigureerd';

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const waitMs = isSmtpRateOrQuotaError(lastErr)
        ? Math.min(
            120_000,
            parseInt(process.env.SMTP_RATE_LIMIT_RETRY_MS || '8000', 10) * Math.pow(2, attempt - 1),
          )
        : 1500 * attempt;
      await new Promise((r) => setTimeout(r, waitMs));
    }

    const cfg = await resolveSmtpConfig(prisma);
    if (!cfg) return { ok: false, error: lastErr };

    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    });

    try {
      await transporter.sendMail({ from: cfg.from, to: addr, subject, html });
      log.log(`E-mail verstuurd naar ${addr}`);
      return { ok: true };
    } catch (e) {
      lastErr = smtpErrorMessage(e);
      log.warn(`SMTP poging ${attempt + 1}/${maxAttempts} → ${addr}: ${lastErr}`);
      if (!isSmtpRateOrQuotaError(lastErr) && attempt >= 1) break;
    } finally {
      try {
        transporter.close();
      } catch {
        /* negeer */
      }
    }
  }

  return { ok: false, error: lastErr };
}

export async function sendHtmlMail(
  prisma: PrismaService,
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const r = await sendHtmlMailDetailed(prisma, to, subject, html);
  return r.ok;
}
