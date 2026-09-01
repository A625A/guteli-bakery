import 'server-only';

import { APIError, createAuthMiddleware } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';

import { getAdminAccessPolicy } from './policies';

const ENROLLMENT_PATHS = new Set([
  '/change-password',
  '/two-factor/enable',
  '/two-factor/verify-totp',
  '/two-factor/verify-backup-code',
]);

function passwordChangeRequired() {
  return new APIError('FORBIDDEN', {
    code: 'PASSWORD_CHANGE_REQUIRED',
    message: 'Password change required',
  });
}

function invalidCredentials() {
  return APIError.from('UNAUTHORIZED', {
    code: 'INVALID_EMAIL_OR_PASSWORD',
    message: 'Invalid email or password',
  });
}

/** Enforces account setup policy on authenticated Better Auth routes. */
export function adminSessionPolicyPlugin(): BetterAuthPlugin {
  return {
    id: 'guteli-admin-session-policy',
    hooks: {
      before: [
        {
          matcher: (ctx) =>
            ctx.path !== undefined && ENROLLMENT_PATHS.has(ctx.path),
          handler: createAuthMiddleware(async (ctx) => {
            const secret = ctx.context.secret;
            if (!secret) throw new Error('Missing Better Auth secret.');
            const token = await ctx.getSignedCookie(
              ctx.context.authCookies.sessionToken.name,
              secret,
            );
            if (!token) return;

            const current =
              await ctx.context.internalAdapter.findSession(token);
            if (!current) return;

            const policy = getAdminAccessPolicy({
              active: current.user.active,
              role: current.user.role,
              twoFactorEnabled: current.user.twoFactorEnabled,
              mustChangePassword: current.user.mustChangePassword,
              setupCredentialExpiresAt: current.user.setupCredentialExpiresAt,
            });
            if (
              policy === 'MFA_REQUIRED' ||
              policy === 'SETUP_CREDENTIAL_EXPIRED'
            ) {
              await ctx.context.internalAdapter.deleteUserSessions(
                current.user.id,
              );
              throw invalidCredentials();
            }
            if (
              policy === 'PASSWORD_CHANGE_REQUIRED' &&
              ctx.path !== '/change-password'
            ) {
              throw passwordChangeRequired();
            }
          }),
        },
      ],
    },
  };
}
