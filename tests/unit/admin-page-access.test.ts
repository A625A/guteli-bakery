import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.hoisted(() => {
  process.env.DATABASE_URL =
    'postgresql://guteli:guteli@127.0.0.1:55433/guteli_test';
});

import { destinationForAdminAuthPage } from '@/server/auth/admin-page-access';

describe('admin authentication page access', () => {
  it('forces setup-password change before MFA enrollment', () => {
    expect(
      destinationForAdminAuthPage(
        'PASSWORD_CHANGE_REQUIRED',
        '/admin/enroll-mfa',
      ),
    ).toBe('/admin/change-password');
  });

  it('does not allow an inactive session to retain an auth page', () => {
    expect(
      destinationForAdminAuthPage('MFA_REQUIRED', '/admin/enroll-mfa'),
    ).toBe('/admin/login');
  });

  it('moves a fully verified session off authentication pages', () => {
    expect(destinationForAdminAuthPage('ALLOWED', '/admin/login')).toBe(
      '/admin',
    );
  });
});
