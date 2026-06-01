import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { PrismaService } from '../prisma/prisma.service';
import { resolveSmtpConfig, smtpTransportOptions } from './mail-smtp-resolve';

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

export type SendHtmlMailOptions = {
  /** Minder retries (bevestigingsmail bij boeking). */
  fast?: boolean;
};

/** SMTP-mail zonder pool — betrouwbaarder voor losse transactionele mails. */
export async function sendHtmlMailDetailed(
  prisma: PrismaService,
  to: string,
  subject: string,
  html: string,
  opts?: SendHtmlMailOptions,
): Promise<{ ok: boolean; error?: string; smtpSource?: string }> {
  const addr = to?.trim();
  if (!addr) return { ok: false, error: 'Geen e-mailadres' };

  const maxAttempts = opts?.fast
    ? 2
    : parseInt(process.env.SMTP_SEND_MAX_ATTEMPTS || '5', 10) || 5;
  let lastErr = 'SMTP niet geconfigureerd (zet SMTP_HOST in .env of Admin → E-mail)';

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const rateBase = opts?.fast ? 1500 : parseInt(process.env.SMTP_RATE_LIMIT_RETRY_MS || '8000', 10);
      const waitMs = isSmtpRateOrQuotaError(lastErr)
        ? Math.min(120_000, rateBase * Math.pow(2, attempt - 1))
        : 1500 * attempt;
      await new Promise((r) => setTimeout(r, waitMs));
    }

    const cfg = await resolveSmtpConfig(prisma);
    if (!cfg) {
      log.error(`SMTP niet geconfigureerd — mail naar ${addr} niet verstuurd.`);
      return { ok: false, error: lastErr };
    }

    if (cfg.user && !cfg.pass) {
      lastErr = 'SMTP-wachtwoord ontbreekt (Admin → E-mail of SMTP_PASS in .env)';
      log.error(`${lastErr} — host ${cfg.host}, bron ${cfg.source}`);
      return { ok: false, error: lastErr, smtpSource: cfg.source };
    }

    const transporter = nodemailer.createTransport(smtpTransportOptions(cfg));

    try {
      await transporter.sendMail({
        from: cfg.from,
        to: addr,
        subject,
        html,
        text: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      });
      log.log(`E-mail verstuurd naar ${addr} via ${cfg.host} (${cfg.source})`);
      return { ok: true, smtpSource: cfg.source };
    } catch (e) {
      lastErr = smtpErrorMessage(e);
      log.warn(
        `SMTP poging ${attempt + 1}/${maxAttempts} → ${addr} (${cfg.host}, ${cfg.source}): ${lastErr}`,
      );
      if (!isSmtpRateOrQuotaError(lastErr) && attempt >= 1) break;
    } finally {
      try {
        transporter.close();
      } catch {
        /* negeer */
      }
    }
  }

  log.error(`E-mail definitief mislukt → ${addr}: ${lastErr}`);
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
