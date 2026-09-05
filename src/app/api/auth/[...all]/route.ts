import { toNextJsHandler } from 'better-auth/next-js';

import { auth } from '@/server/auth/auth';
import {
  InvalidMutationOriginError,
  requireTrustedMutationOrigin,
} from '@/server/security/origin';

const handlers = toNextJsHandler(auth);

function hasCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return false;

  return cookieHeader.split(';').some((segment) => {
    const separator = segment.indexOf('=');
    return separator > 0 && segment.slice(0, separator).trim() === name;
  });
}

export const GET = handlers.GET;

export async function POST(request: Request) {
  const sessionCookieName = (await auth.$context).authCookies.sessionToken.name;
  if (hasCookie(request.headers.get('cookie'), sessionCookieName)) {
    try {
      requireTrustedMutationOrigin(request.headers);
    } catch (error) {
      if (!(error instanceof InvalidMutationOriginError)) throw error;
      return Response.json(
        { code: error.code, message: 'Invalid request origin' },
        { status: 403, headers: { 'cache-control': 'private, no-store' } },
      );
    }
  }

  return handlers.POST(request);
}
