import { config } from 'dotenv';
import { resolve } from 'node:path';
import nodemailer from 'nodemailer';

config({ path: resolve(__dirname, '../../../../.env'), override: true });
config({ path: resolve(process.cwd(), '../../.env'), override: true });

function fromAddress() {
  const from = process.env.SMTP_FROM?.trim();
  if (from) {
    return from;
  }
  const user = smtpUser();
  return user ? `FalconV <${user}>` : 'FalconV';
}

export function adminNotifyEmail() {
  const value = process.env.ADMIN_NOTIFY_EMAIL?.trim();
  if (!value) {
    throw new Error('ADMIN_NOTIFY_EMAIL is not set');
  }
  return value.toLowerCase();
}

function smtpUser() {
  return process.env.SMTP_USER?.trim() ?? '';
}

function smtpPass() {
  return process.env.SMTP_PASS?.replace(/\s+/g, '') ?? '';
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',
  requireTLS: process.env.SMTP_SECURE !== 'true',
  auth: smtpPass()
    ? { user: smtpUser(), pass: smtpPass() }
    : undefined,
});

export async function sendMail(options: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}) {
  if (!smtpPass()) {
    throw new Error('SMTP_PASS is missing. Set a Gmail App Password in .env (SMTP_PASS).');
  }
  await transporter.sendMail({
    from: fromAddress(),
    replyTo: adminNotifyEmail(),
    ...options,
  });
}
