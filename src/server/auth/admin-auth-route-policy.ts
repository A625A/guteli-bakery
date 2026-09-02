import 'server-only';

import { getAdminAccessPolicy, type AdminAccessUser } from './policies';

export type AdminAuthSessionState =
  | 'UNAUTHENTICATED_OR_MFA_CHALLENGE'
  | 'PASSWORD_CHANGE_REQUIRED'
  | 'MFA_ENROLLMENT_REQUIRED'
  | 'MFA_REQUIRED'
  | 'MFA_VERIFIED'
  | 'ACCOUNT_INACTIVE'
  | 'SETUP_CREDENTIAL_EXPIRED';

type StoredAdminSession = AdminAccessUser &
  Readonly<{ mfaVerifiedAt: Date | null }>;

const UNAUTHENTICATED = 'UNAUTHENTICATED_OR_MFA_CHALLENGE';
const PASSWORD_CHANGE = 'PASSWORD_CHANGE_REQUIRED';
const MFA_ENROLLMENT = 'MFA_ENROLLMENT_REQUIRED';
const MFA_REQUIRED = 'MFA_REQUIRED';
const MFA_VERIFIED = 'MFA_VERIFIED';
const ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE';
const SETUP_EXPIRED = 'SETUP_CREDENTIAL_EXPIRED';

const NEVER: readonly AdminAuthSessionState[] = [];
const PUBLIC: readonly AdminAuthSessionState[] = [UNAUTHENTICATED];
const CURRENT_SESSION: readonly AdminAuthSessionState[] = [
  UNAUTHENTICATED,
  PASSWORD_CHANGE,
  MFA_ENROLLMENT,
  MFA_VERIFIED,
];
const CURRENT_LOGOUT: readonly AdminAuthSessionState[] = [
  UNAUTHENTICATED,
  PASSWORD_CHANGE,
  MFA_ENROLLMENT,
  MFA_REQUIRED,
  MFA_VERIFIED,
  ACCOUNT_INACTIVE,
  SETUP_EXPIRED,
];
const LOGOUT_ALL: readonly AdminAuthSessionState[] = [
  PASSWORD_CHANGE,
  MFA_ENROLLMENT,
  MFA_VERIFIED,
];
const CHALLENGE_OR_ENROLLMENT: readonly AdminAuthSessionState[] = [
  UNAUTHENTICATED,
  MFA_ENROLLMENT,
];
const VERIFIED_ONLY: readonly AdminAuthSessionState[] = [MFA_VERIFIED];

/**
 * Complete Better Auth 1.7.2 HTTP surface installed by `auth.ts`.
 *
 * Empty entries are intentionally disabled by the application. Unknown paths
 * are denied by `isAdminAuthPathAllowed`, so a dependency upgrade exposes no
 * authenticated operation until this inventory and its integration test are
 * reviewed together.
 */
export const ADMIN_AUTH_HTTP_ENDPOINT_POLICY = {
  '/sign-in/social': NEVER,
  '/callback/:id': NEVER,
  '/get-session': CURRENT_SESSION,
  '/sign-out': CURRENT_LOGOUT,
  '/sign-up/email': PUBLIC,
  '/sign-in/email': PUBLIC,
  '/reset-password': NEVER,
  '/verify-password': VERIFIED_ONLY,
  '/verify-email': NEVER,
  '/send-verification-email': NEVER,
  '/change-email': NEVER,
  '/change-password': [PASSWORD_CHANGE, MFA_VERIFIED],
  '/update-session': VERIFIED_ONLY,
  '/update-user': VERIFIED_ONLY,
  '/delete-user': NEVER,
  '/request-password-reset': NEVER,
  '/reset-password/:token': NEVER,
  '/list-sessions': VERIFIED_ONLY,
  '/revoke-session': VERIFIED_ONLY,
  '/revoke-sessions': LOGOUT_ALL,
  '/revoke-other-sessions': VERIFIED_ONLY,
  '/link-social': NEVER,
  '/list-accounts': NEVER,
  '/delete-user/callback': NEVER,
  '/unlink-account': NEVER,
  '/refresh-token': NEVER,
  '/get-access-token': NEVER,
  '/account-info': NEVER,
  '/two-factor/get-totp-uri': NEVER,
  '/two-factor/verify-totp': CHALLENGE_OR_ENROLLMENT,
  '/two-factor/send-otp': NEVER,
  '/two-factor/verify-otp': NEVER,
  '/two-factor/verify-backup-code': CHALLENGE_OR_ENROLLMENT,
  '/two-factor/generate-backup-codes': NEVER,
  '/two-factor/enable': [MFA_ENROLLMENT],
  '/two-factor/disable': NEVER,
  '/ok': PUBLIC,
  '/error': PUBLIC,
} as const satisfies Record<string, readonly AdminAuthSessionState[]>;

export function isAdminAuthPathAllowed(
  state: AdminAuthSessionState,
  path: string,
) {
  const allowedStates = (
    ADMIN_AUTH_HTTP_ENDPOINT_POLICY as Record<
      string,
      readonly AdminAuthSessionState[] | undefined
    >
  )[path];
  return allowedStates?.includes(state) ?? false;
}

/** Shared authoritative state resolver for Better Auth hooks and Task 3 DAL. */
export function getAdminAuthSessionState(
  stored: StoredAdminSession,
  now: Date = new Date(),
): Exclude<AdminAuthSessionState, 'UNAUTHENTICATED_OR_MFA_CHALLENGE'> {
  if (!stored.active) return ACCOUNT_INACTIVE;

  const policy = getAdminAccessPolicy(stored, now);
  switch (policy) {
    case 'SETUP_CREDENTIAL_EXPIRED':
      return SETUP_EXPIRED;
    case 'PASSWORD_CHANGE_REQUIRED':
      return PASSWORD_CHANGE;
    case 'MFA_ENROLLMENT_REQUIRED':
      return MFA_ENROLLMENT;
    case 'MFA_REQUIRED':
      return MFA_REQUIRED;
    case 'ALLOWED':
      return stored.mfaVerifiedAt === null ? MFA_REQUIRED : MFA_VERIFIED;
  }
}
