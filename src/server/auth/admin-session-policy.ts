import 'server-only';

import { APIError, createAuthMiddleware } from 'better-auth/api';
import { deleteSessionCookie } from 'better-auth/cookies';
import type { BetterAuthPlugin } from 'better-auth';

import {
  getAdminAuthSessionState,
  isAdminAuthPathAllowed,
  type AdminAuthSessionState,
} from './admin-auth-route-policy';

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

function mfaEnrollmentRequired() {
  return new APIError('FORBIDDEN', {
    code: 'MFA_ENROLLMENT_REQUIRED',
    message: 'MFA enrollment required',
  });
}

function operationNotAllowed() {
  return new APIError('FORBIDDEN', {
    code: 'AUTH_OPERATION_NOT_ALLOWED',
    message: 'Authentication operation not allowed',
  });
}

function deniedForState(state: AdminAuthSessionState) {
  switch (state) {
    case 'PASSWORD_CHANGE_REQUIRED':
      return passwordChangeRequired();
    case 'MFA_ENROLLMENT_REQUIRED':
      return mfaEnrollmentRequired();
    case 'MFA_VERIFIED':
      return operationNotAllowed();
    case 'UNAUTHENTICATED_OR_MFA_CHALLENGE':
    case 'MFA_REQUIRED':
    case 'ACCOUNT_INACTIVE':
    case 'SETUP_CREDENTIAL_EXPIRED':
      return invalidCredentials();
  }
}

/** Enforces fail-closed account and session policy on every HTTP auth route. */
export function adminSessionPolicyPlugin(): BetterAuthPlugin {
  return {
    id: 'guteli-admin-session-policy',
    hooks: {
      before: [
        {
          // Pathless endpoints are Better Auth server-only helpers, not HTTP.
          matcher: (ctx) => ctx.path !== undefined,
          handler: createAuthMiddleware(async (ctx) => {
            const path = ctx.path;
            const secret = ctx.context.secret;
            if (!secret) throw new Error('Missing Better Auth secret.');
            const token = await ctx.getSignedCookie(
              ctx.context.authCookies.sessionToken.name,
              secret,
            );
            if (!token) {
              const state = 'UNAUTHENTICATED_OR_MFA_CHALLENGE';
              if (isAdminAuthPathAllowed(state, path)) return;
              throw deniedForState(state);
            }

            const current =
              await ctx.context.internalAdapter.findSession(token);
            if (!current) {
              deleteSessionCookie(ctx);
              const state = 'UNAUTHENTICATED_OR_MFA_CHALLENGE';
              if (isAdminAuthPathAllowed(state, path)) return;
              throw deniedForState(state);
            }

            const state = getAdminAuthSessionState({
              active: current.user.active,
              role: current.user.role,
              twoFactorEnabled: current.user.twoFactorEnabled,
              mustChangePassword: current.user.mustChangePassword,
              setupCredentialExpiresAt: current.user.setupCredentialExpiresAt,
              mfaVerifiedAt: current.session.mfaVerifiedAt,
            });
            if (
              state === 'ACCOUNT_INACTIVE' ||
              state === 'SETUP_CREDENTIAL_EXPIRED'
            ) {
              await ctx.context.internalAdapter.deleteUserSessions(
                current.user.id,
              );
              deleteSessionCookie(ctx);
            }
            if (state === 'MFA_REQUIRED') {
              await ctx.context.internalAdapter.deleteSession(
                current.session.token,
              );
              deleteSessionCookie(ctx);
            }

            if (isAdminAuthPathAllowed(state, path)) return;
            throw deniedForState(state);
          }),
        },
      ],
    },
  };
}
