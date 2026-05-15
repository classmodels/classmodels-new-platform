import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

const log = new Logger('sendHtmlMail');

/** SMTP-mail zonder Nest-module (voorkomt Auth ↔ Agenda circular import). */
export async function sendHtmlMail(to: string, subject: string, html: string): Promise<boolean> {
  const addr = to?.trim();
  if (!addr) return false;

  const host = process.env.SMTP_HOST?.trim();
  if (!host) return false;

  const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
  const secure = process.env.SMTP_SECURE === '1' || port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS ?? '';

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  });

  const from = process.env.MAIL_FROM?.trim() || 'Class Models <noreply@classmodels.be>';

  await transporter.sendMail({ from, to: addr, subject, html });
  log.log(`E-mail verstuurd naar ${addr}`);
  return true;
}
