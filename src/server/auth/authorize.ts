import 'server-only';

import type {
  AdminSessionAccess,
  VerifiedAdminSession,
} from './admin-page-access';
import { getAdminSession } from './session';

export type AuthorizationErrorCode =
  | 'UNAUTHENTICATED'
  | 'MFA_REQUIRED'
  | 'FORBIDDEN'
  | 'REAUTHENTICATION_REQUIRED';

export class AuthorizationError extends Error {
  readonly code: AuthorizationErrorCode;

  constructor(code: AuthorizationErrorCode) {
    super(code);
    this.name = 'AuthorizationError';
    this.code = code;
  }
}

export type AuthorizedActor = VerifiedAdminSession;

export function authorizeAdminAccess(
  access: AdminSessionAccess,
): AuthorizedActor {
  if (access.policy === 'ALLOWED') return access.principal;
  if (access.policy === 'UNAUTHENTICATED') {
    throw new AuthorizationError('UNAUTHENTICATED');
  }
  throw new AuthorizationError('MFA_REQUIRED');
}

export function authorizeOwnerAccess(actor: AuthorizedActor): AuthorizedActor {
  if (actor.role !== 'OWNER') throw new AuthorizationError('FORBIDDEN');
  return actor;
}

export async function requireAdmin(
  requestHeaders?: Headers,
): Promise<AuthorizedActor> {
  return authorizeAdminAccess(await getAdminSession(requestHeaders));
}

export async function requireOwner(
  requestHeaders?: Headers,
): Promise<AuthorizedActor> {
  return authorizeOwnerAccess(await requireAdmin(requestHeaders));
}
