import 'server-only';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { isAPIError } from 'better-auth/api';
import { and, eq } from 'drizzle-orm';

import { getAdminAuthSessionState } from './admin-auth-route-policy';
import { auth } from './auth';
import type { AdminAccessPolicy } from './policies';
import { db } from '@/server/db/client';
import { session, user } from '@/server/db/schema';

const LOGIN = '/admin/login';
const ENROLLMENT = '/admin/enroll-mfa';
const PASSWORD_CHANGE = '/admin/change-password';

export function destinationForAdminAuthPage(
  policy: AdminAccessPolicy,
  requestedPath: string,
) {
  switch (policy) {
    case 'PASSWORD_CHANGE_REQUIRED':
      return requestedPath === PASSWORD_CHANGE ? null : PASSWORD_CHANGE;
    case 'MFA_ENROLLMENT_REQUIRED':
      return requestedPath === ENROLLMENT ? null : ENROLLMENT;
    case 'ALLOWED':
      return '/admin';
    case 'MFA_REQUIRED':
    case 'SETUP_CREDENTIAL_EXPIRED':
      return LOGIN;
  }
}

export type VerifiedAdminSession = Readonly<{
  sessionId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN';
  mfaVerifiedAt: Date;
}>;

export type AdminSessionAccess =
  | Readonly<{ policy: Exclude<AdminAccessPolicy, 'ALLOWED'> }>
  | Readonly<{ policy: 'UNAUTHENTICATED' }>
  | Readonly<{ policy: 'ALLOWED'; principal: VerifiedAdminSession }>;

/** Authoritative reusable boundary for Task 3 admin data and route handlers. */
export async function getAdminSessionAccess(
  requestHeaders: Headers,
): Promise<AdminSessionAccess> {
  let current;
  try {
    current = await auth.api.getSession({
      headers: requestHeaders,
      query: { disableCookieCache: true, disableRefresh: true },
    });
  } catch (error) {
    if (isAPIError(error) && error.statusCode === 401) {
      return { policy: 'UNAUTHENTICATED' };
    }
    throw error;
  }
  if (!current) return { policy: 'UNAUTHENTICATED' };

  const [stored] = await db
    .select({
      sessionId: session.id,
      sessionUserId: session.userId,
      mfaVerifiedAt: session.mfaVerifiedAt,
      active: user.active,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      mustChangePassword: user.mustChangePassword,
      setupCredentialExpiresAt: user.setupCredentialExpiresAt,
    })
    .from(session)
    .innerJoin(user, eq(user.id, session.userId))
    .where(
      and(
        eq(session.id, current.session.id),
        eq(session.userId, current.user.id),
      ),
    )
    .limit(1);
  if (!stored) return { policy: 'UNAUTHENTICATED' };

  const state = getAdminAuthSessionState(stored);
  switch (state) {
    case 'ACCOUNT_INACTIVE':
      await db.delete(session).where(eq(session.userId, stored.sessionUserId));
      return { policy: 'MFA_REQUIRED' };
    case 'SETUP_CREDENTIAL_EXPIRED':
      await db.delete(session).where(eq(session.userId, stored.sessionUserId));
      return { policy: 'SETUP_CREDENTIAL_EXPIRED' };
    case 'MFA_REQUIRED':
      await db.delete(session).where(eq(session.id, stored.sessionId));
      return { policy: 'MFA_REQUIRED' };
    case 'PASSWORD_CHANGE_REQUIRED':
      return { policy: 'PASSWORD_CHANGE_REQUIRED' };
    case 'MFA_ENROLLMENT_REQUIRED':
      return { policy: 'MFA_ENROLLMENT_REQUIRED' };
    case 'MFA_VERIFIED':
      break;
  }

  return {
    policy: 'ALLOWED',
    principal: {
      sessionId: stored.sessionId,
      userId: stored.sessionUserId,
      role: stored.role,
      mfaVerifiedAt: stored.mfaVerifiedAt!,
    },
  };
}

/** Server-side gate for the Task 2 authentication pages. */
export async function requireAdminAuthPage(requestedPath: string) {
  const currentHeaders = await headers();
  const access = await getAdminSessionAccess(currentHeaders);
  if (access.policy === 'UNAUTHENTICATED') {
    if (requestedPath !== LOGIN) redirect(LOGIN);
    return;
  }
  const destination = destinationForAdminAuthPage(access.policy, requestedPath);
  if (destination) redirect(destination);
}

/** Reusable verified boundary for every business-admin page. */
export async function requireVerifiedAdminSession() {
  const currentHeaders = await headers();
  const access = await getAdminSessionAccess(currentHeaders);
  switch (access.policy) {
    case 'ALLOWED':
      return access.principal;
    case 'PASSWORD_CHANGE_REQUIRED':
      redirect(PASSWORD_CHANGE);
    case 'MFA_ENROLLMENT_REQUIRED':
      redirect(ENROLLMENT);
    case 'MFA_REQUIRED':
    case 'SETUP_CREDENTIAL_EXPIRED':
    case 'UNAUTHENTICATED':
      redirect(LOGIN);
  }
}

/** A 2FA challenge has no session; only redirect an already-verified visitor. */
export async function redirectVerifiedAdminFromMfaChallenge() {
  const currentHeaders = await headers();
  const access = await getAdminSessionAccess(currentHeaders);
  switch (access.policy) {
    case 'UNAUTHENTICATED':
      return;
    case 'ALLOWED':
      redirect('/admin');
    case 'PASSWORD_CHANGE_REQUIRED':
      redirect(PASSWORD_CHANGE);
    case 'MFA_ENROLLMENT_REQUIRED':
      redirect(ENROLLMENT);
    case 'MFA_REQUIRED':
    case 'SETUP_CREDENTIAL_EXPIRED':
      redirect(LOGIN);
  }
}
