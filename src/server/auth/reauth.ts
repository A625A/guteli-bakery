import 'server-only';

import {
  AuthorizationError,
  requireAdmin,
  type AuthorizedActor,
} from './authorize';

export const MAX_REAUTHENTICATION_AGE_SECONDS = 10 * 60;

export function assertRecentReauthentication(
  actor: AuthorizedActor,
  maxAgeSeconds: number,
  now: Date = new Date(),
) {
  if (
    !Number.isInteger(maxAgeSeconds) ||
    maxAgeSeconds < 0 ||
    maxAgeSeconds > MAX_REAUTHENTICATION_AGE_SECONDS
  ) {
    throw new RangeError(
      'Reauthentication age must be between 0 and 600 seconds.',
    );
  }

  const ageMilliseconds = now.getTime() - actor.mfaVerifiedAt.getTime();
  if (ageMilliseconds < 0 || ageMilliseconds > maxAgeSeconds * 1_000) {
    throw new AuthorizationError('REAUTHENTICATION_REQUIRED');
  }
  return actor;
}

export async function requireRecentReauthentication(
  maxAgeSeconds: number,
  requestHeaders?: Headers,
) {
  return assertRecentReauthentication(
    await requireAdmin(requestHeaders),
    maxAgeSeconds,
  );
}
