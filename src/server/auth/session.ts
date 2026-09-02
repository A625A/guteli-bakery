import 'server-only';

import { headers } from 'next/headers';

import {
  getAdminSessionAccess,
  type AdminSessionAccess,
} from './admin-page-access';

/** Resolves the authoritative database-backed admin session for this request. */
export async function getAdminSession(
  requestHeaders?: Headers,
): Promise<AdminSessionAccess> {
  return getAdminSessionAccess(requestHeaders ?? (await headers()));
}
