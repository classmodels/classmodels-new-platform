import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { PrismaService } from '../prisma/prisma.service';
import { resolveSmtpConfig } from './mail-smtp-resolve';

const log = new Logger('sendHtmlMail');

/** SMTP-mail zonder Nest-module (voorkomt Auth ↔ Agenda circular import). */
export async function sendHtmlMail(
  prisma: PrismaService,
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const addr = to?.trim();
  if (!addr) return false;

  const cfg = await resolveSmtpConfig(prisma);
  if (!cfg) return false;

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
  });

  await transporter.sendMail({ from: cfg.from, to: addr, subject, html });
  log.log(`E-mail verstuurd naar ${addr}`);
  return true;
}
