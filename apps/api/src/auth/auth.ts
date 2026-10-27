import { createHash, randomBytes } from 'node:crypto';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '../../../../.env') });
config({ path: resolve(process.cwd(), '../../.env') });
import { prisma } from '@falconv/db';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

export function hashInviteToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function createInviteToken() {
  return randomBytes(32).toString('hex');
}

function requireAuthSecret() {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (secret && secret.length >= 32 && secret !== 'replace-with-a-32-char-or-longer-secret') {
    return secret;
  }
  if (process.env.NODE_ENV === 'test') {
    return 'falconv-test-only-secret-do-not-use-in-production';
  }
  throw new Error(
    'BETTER_AUTH_SECRET must be set to a unique value of at least 32 characters. Do not use the example placeholder.',
  );
}

export const auth = betterAuth({
  appName: 'FalconV',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  basePath: '/api/auth',
  secret: requireAuthSecret(),
  trustedOrigins: [process.env.WEB_URL ?? 'http://localhost:3000'],
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 10,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const { sendMail } = await import('../mail/mailer');
      await sendMail({
        to: user.email,
        subject: 'Reset your FalconV password',
        text: `Reset your password: ${url}`,
        html: `<p>Reset your password: <a href="${url}">${url}</a></p>`,
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    defaultCookieAttributes: {
      sameSite: 'lax',
      httpOnly: true,
      path: '/',
    },
  },
});
