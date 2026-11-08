import 'server-only';

import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth';
import { twoFactor } from 'better-auth/plugins';

import { safeAuthLog } from '@/server/observability/safe-log';
import { isNetlify } from '@/server/config/platform';
import { db } from '@/server/db/client';
import * as schema from '@/server/db/schema';

import { adminSessionPolicyPlugin } from './admin-session-policy';
import { loginProtectionPlugin } from './login-protection';

const isProduction = process.env.NODE_ENV === 'production';

function requiredProductionAuthValue(
  value: string | undefined,
  name: 'BETTER_AUTH_SECRET' | 'BETTER_AUTH_URL',
) {
  if (isProduction && !value) {
    throw new Error(`${name} is required in production.`);
  }

  return value;
}

const applicationOrigin =
  requiredProductionAuthValue(process.env.BETTER_AUTH_URL, 'BETTER_AUTH_URL') ??
  'http://localhost:3000';
const authSecret = requiredProductionAuthValue(
  process.env.BETTER_AUTH_SECRET,
  'BETTER_AUTH_SECRET',
);

export const auth = betterAuth({
  logger: { level: 'warn', log: safeAuthLog },
  // Let our HTTP boundary handle unexpected errors before Better Call logs them.
  onAPIError: { throw: true },
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  baseURL: applicationOrigin,
  secret: authSecret,
  trustedOrigins: [applicationOrigin],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 14,
  },
  // Preserve the existing credential-only schema after Better Auth 1.7.7
  // stopped declaring issuer as a core account field. No schema rewrite needed.
  account: {
    additionalFields: {
      issuer: {
        type: 'string',
        required: true,
        defaultValue: 'local:credential',
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 60,
    additionalFields: {
      mfaVerifiedAt: {
        type: 'date',
        required: false,
        input: false,
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'ADMIN',
        input: false,
      },
      active: {
        type: 'boolean',
        required: true,
        defaultValue: true,
        input: false,
      },
      mustChangePassword: {
        type: 'boolean',
        required: true,
        defaultValue: false,
        input: false,
      },
      setupCredentialExpiresAt: {
        type: 'date',
        required: false,
        input: false,
      },
    },
  },
  advanced: {
    useSecureCookies: isProduction,
    ipAddress: {
      ipAddressHeaders: isNetlify()
        ? ['x-nf-client-connection-ip']
        : ['x-forwarded-for'],
    },
    database: {
      generateId: 'uuid',
    },
  },
  plugins: [
    adminSessionPolicyPlugin(),
    twoFactor({ issuer: 'Guteli Bakery', accountLockout: { enabled: true } }),
    loginProtectionPlugin(),
  ],
});
