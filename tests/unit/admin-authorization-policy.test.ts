import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/server/auth/session', () => ({ getAdminSession: vi.fn() }));

import {
  AuthorizationError,
  authorizeAdminAccess,
  authorizeOwnerAccess,
} from '@/server/auth/authorize';
import { assertRecentReauthentication } from '@/server/auth/reauth';

const verifiedOwner = {
  policy: 'ALLOWED' as const,
  principal: {
    sessionId: 'session-id',
    userId: 'user-id',
    role: 'OWNER' as const,
    mfaVerifiedAt: new Date('2026-09-01T12:00:00.000Z'),
  },
};

describe('admin authorization policy', () => {
  it('distinguishes unauthenticated, incomplete MFA, and forbidden roles', () => {
    expect(() =>
      authorizeAdminAccess({ policy: 'UNAUTHENTICATED' }),
    ).toThrowError(new AuthorizationError('UNAUTHENTICATED'));
    expect(() => authorizeAdminAccess({ policy: 'MFA_REQUIRED' })).toThrowError(
      new AuthorizationError('MFA_REQUIRED'),
    );

    const admin = authorizeAdminAccess({
      ...verifiedOwner,
      principal: { ...verifiedOwner.principal, role: 'ADMIN' as const },
    });
    expect(() => authorizeOwnerAccess(admin)).toThrowError(
      new AuthorizationError('FORBIDDEN'),
    );
    expect(authorizeOwnerAccess(verifiedOwner.principal)).toEqual(
      verifiedOwner.principal,
    );
  });

  it('uses the server MFA timestamp and enforces an exact ten-minute ceiling', () => {
    const exactlyTenMinutes = new Date('2026-09-01T12:10:00.000Z');
    expect(
      assertRecentReauthentication(
        verifiedOwner.principal,
        600,
        exactlyTenMinutes,
      ),
    ).toEqual(verifiedOwner.principal);

    expect(() =>
      assertRecentReauthentication(
        verifiedOwner.principal,
        600,
        new Date('2026-09-01T12:10:00.001Z'),
      ),
    ).toThrowError(new AuthorizationError('REAUTHENTICATION_REQUIRED'));
    expect(() =>
      assertRecentReauthentication(
        verifiedOwner.principal,
        601,
        exactlyTenMinutes,
      ),
    ).toThrow(RangeError);
  });
});
