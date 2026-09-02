import 'server-only';

export class InvalidMutationOriginError extends Error {
  readonly code = 'INVALID_ORIGIN' as const;

  constructor() {
    super('INVALID_ORIGIN');
    this.name = 'InvalidMutationOriginError';
  }
}

function parseSerializedOrigin(value: string) {
  try {
    const parsed = new URL(value);
    if (parsed.origin !== value || parsed.username || parsed.password)
      return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

/** Fails closed unless a cookie-authenticated mutation has the trusted Origin. */
export function requireTrustedMutationOrigin(
  requestHeaders: Headers,
  applicationOrigin = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
) {
  const trusted = parseSerializedOrigin(applicationOrigin);
  const supplied = requestHeaders.get('origin');
  if (!trusted || !supplied || parseSerializedOrigin(supplied) !== trusted) {
    throw new InvalidMutationOriginError();
  }
}
