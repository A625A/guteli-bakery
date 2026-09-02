import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  ADMIN_AUTH_HTTP_ENDPOINT_POLICY,
  getAdminAuthSessionState,
  isAdminAuthPathAllowed,
  type AdminAuthSessionState,
} from '@/server/auth/admin-auth-route-policy';

describe('admin auth route policy', () => {
  it.each([
    ['UNAUTHENTICATED_OR_MFA_CHALLENGE', '/sign-in/email'],
    ['UNAUTHENTICATED_OR_MFA_CHALLENGE', '/sign-up/email'],
    ['UNAUTHENTICATED_OR_MFA_CHALLENGE', '/get-session'],
    ['UNAUTHENTICATED_OR_MFA_CHALLENGE', '/sign-out'],
    ['UNAUTHENTICATED_OR_MFA_CHALLENGE', '/two-factor/verify-totp'],
    ['UNAUTHENTICATED_OR_MFA_CHALLENGE', '/two-factor/verify-backup-code'],
    ['PASSWORD_CHANGE_REQUIRED', '/change-password'],
    ['PASSWORD_CHANGE_REQUIRED', '/sign-out'],
    ['MFA_ENROLLMENT_REQUIRED', '/two-factor/enable'],
    ['MFA_ENROLLMENT_REQUIRED', '/two-factor/verify-totp'],
    ['MFA_ENROLLMENT_REQUIRED', '/revoke-sessions'],
    ['MFA_VERIFIED', '/update-user'],
    ['MFA_VERIFIED', '/list-sessions'],
    ['MFA_VERIFIED', '/change-password'],
    ['MFA_VERIFIED', '/revoke-sessions'],
  ] as const)('allows %s to call %s', (state, path) => {
    expect(isAdminAuthPathAllowed(state, path)).toBe(true);
  });

  it.each([
    ['PASSWORD_CHANGE_REQUIRED', '/update-user'],
    ['PASSWORD_CHANGE_REQUIRED', '/two-factor/enable'],
    ['MFA_ENROLLMENT_REQUIRED', '/update-user'],
    ['MFA_ENROLLMENT_REQUIRED', '/list-sessions'],
    ['MFA_REQUIRED', '/update-user'],
    ['ACCOUNT_INACTIVE', '/list-sessions'],
    ['SETUP_CREDENTIAL_EXPIRED', '/update-user'],
    ['MFA_VERIFIED', '/delete-user'],
    ['MFA_VERIFIED', '/two-factor/disable'],
  ] as const)('denies %s from calling %s', (state, path) => {
    expect(isAdminAuthPathAllowed(state, path)).toBe(false);
  });

  it('fails closed for an endpoint absent from the installed inventory', () => {
    const states: AdminAuthSessionState[] = [
      'UNAUTHENTICATED_OR_MFA_CHALLENGE',
      'PASSWORD_CHANGE_REQUIRED',
      'MFA_ENROLLMENT_REQUIRED',
      'MFA_REQUIRED',
      'MFA_VERIFIED',
      'ACCOUNT_INACTIVE',
      'SETUP_CREDENTIAL_EXPIRED',
    ];

    for (const state of states) {
      expect(isAdminAuthPathAllowed(state, '/future-protected-endpoint')).toBe(
        false,
      );
    }
    expect(ADMIN_AUTH_HTTP_ENDPOINT_POLICY).not.toHaveProperty(
      '/future-protected-endpoint',
    );
  });

  it('derives an authoritative session state from user policy and MFA marker', () => {
    const base = {
      active: true,
      mustChangePassword: false,
      role: 'OWNER',
      setupCredentialExpiresAt: null,
      twoFactorEnabled: true,
    } as const;

    expect(
      getAdminAuthSessionState({ ...base, mfaVerifiedAt: new Date() }),
    ).toBe('MFA_VERIFIED');
    expect(getAdminAuthSessionState({ ...base, mfaVerifiedAt: null })).toBe(
      'MFA_REQUIRED',
    );
    expect(
      getAdminAuthSessionState({
        ...base,
        active: false,
        mfaVerifiedAt: new Date(),
      }),
    ).toBe('ACCOUNT_INACTIVE');
    expect(
      getAdminAuthSessionState({
        ...base,
        mustChangePassword: true,
        setupCredentialExpiresAt: new Date(0),
        mfaVerifiedAt: null,
      }),
    ).toBe('SETUP_CREDENTIAL_EXPIRED');
    expect(
      getAdminAuthSessionState({
        ...base,
        mustChangePassword: true,
        mfaVerifiedAt: null,
      }),
    ).toBe('PASSWORD_CHANGE_REQUIRED');
    expect(
      getAdminAuthSessionState({
        ...base,
        twoFactorEnabled: false,
        mfaVerifiedAt: null,
      }),
    ).toBe('MFA_ENROLLMENT_REQUIRED');
  });
});
