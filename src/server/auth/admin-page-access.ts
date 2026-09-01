import 'server-only';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { and, eq } from 'drizzle-orm';

import { auth } from './auth';
import { getAdminAccessPolicy, type AdminAccessPolicy } from './policies';
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
      return null;
    case 'MFA_REQUIRED':
    case 'SETUP_CREDENTIAL_EXPIRED':
      return LOGIN;
  }
}

/** Server-side gate for the Task 2 authentication pages. */
export async function requireAdminAuthPage(requestedPath: string) {
  const currentHeaders = await headers();
  const current = await auth.api.getSession({ headers: currentHeaders });
  if (!current) {
    if (requestedPath !== LOGIN) redirect(LOGIN);
    return;
  }

  const [storedUser] = await db
    .select({
      active: user.active,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      mustChangePassword: user.mustChangePassword,
      setupCredentialExpiresAt: user.setupCredentialExpiresAt,
    })
    .from(user)
    .where(eq(user.id, current.user.id))
    .limit(1);

  if (
    !storedUser ||
    (storedUser.role !== 'OWNER' && storedUser.role !== 'ADMIN')
  ) {
    await db.delete(session).where(eq(session.id, current.session.id));
    redirect(LOGIN);
  }

  const policy = getAdminAccessPolicy(storedUser);
  if (policy === 'MFA_REQUIRED' || policy === 'SETUP_CREDENTIAL_EXPIRED') {
    await db
      .delete(session)
      .where(
        and(
          eq(session.id, current.session.id),
          eq(session.userId, current.user.id),
        ),
      );
  }
  const destination = destinationForAdminAuthPage(policy, requestedPath);
  if (destination) redirect(destination);
}
