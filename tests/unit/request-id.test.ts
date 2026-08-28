import { describe, expect, it } from 'vitest';

const validRequestId = '63f2debf-7d45-4d6b-a78f-43ff8d64fe98';

describe('getRequestId', () => {
  it('keeps a valid UUID request ID header', async () => {
    const { getRequestId } = await import('@/server/observability/request-id');

    expect(getRequestId(new Headers({ 'x-request-id': validRequestId }))).toBe(
      validRequestId,
    );
  });

  it('replaces a malformed request ID header with a UUID', async () => {
    const { getRequestId } = await import('@/server/observability/request-id');

    const requestId = getRequestId(
      new Headers({ 'x-request-id': 'not-a-uuid' }),
    );

    expect(requestId).not.toBe('not-a-uuid');
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
