import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/server/db/health', () => ({
  checkDatabaseConnection: vi.fn(),
}));

const validRequestId = '63f2debf-7d45-4d6b-a78f-43ff8d64fe98';

describe('GET /health', () => {
  it('returns a safe 503 response when the database is unavailable', async () => {
    const { checkDatabaseConnection } = await import('@/server/db/health');
    const { GET } = await import('@/app/health/route');

    vi.mocked(checkDatabaseConnection).mockRejectedValueOnce(
      new Error('database unavailable'),
    );

    const response = await GET(
      new Request('http://localhost/health', {
        headers: { 'x-request-id': validRequestId },
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: 'unavailable',
      database: 'down',
      requestId: validRequestId,
    });
    expect(response.headers.get('x-request-id')).toBe(validRequestId);
  });
});
