import 'server-only';

export type AdminAccessUser = Readonly<{
  active: boolean;
  role: 'OWNER' | 'ADMIN';
  twoFactorEnabled: boolean | null;
  mustChangePassword: boolean;
  setupCredentialExpiresAt: Date | null;
}>;

export type AdminAccessPolicy =
  | 'MFA_REQUIRED'
  | 'MFA_ENROLLMENT_REQUIRED'
  | 'PASSWORD_CHANGE_REQUIRED'
  | 'SETUP_CREDENTIAL_EXPIRED'
  | 'ALLOWED';

export function getAdminAccessPolicy(
  user: AdminAccessUser,
  now: Date = new Date(),
): AdminAccessPolicy {
  if (!user.active) return 'MFA_REQUIRED';

  if (
    user.mustChangePassword &&
    user.setupCredentialExpiresAt !== null &&
    user.setupCredentialExpiresAt.getTime() <= now.getTime()
  ) {
    return 'SETUP_CREDENTIAL_EXPIRED';
  }

  if (user.mustChangePassword) return 'PASSWORD_CHANGE_REQUIRED';
  if (!user.twoFactorEnabled) return 'MFA_ENROLLMENT_REQUIRED';
  return 'ALLOWED';
}

export function canAccessAdminBusiness(
  user: AdminAccessUser,
  now: Date = new Date(),
) {
  return getAdminAccessPolicy(user, now) === 'ALLOWED';
}
