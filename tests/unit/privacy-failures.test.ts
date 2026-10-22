import { mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/server/db/client', () => ({ db: {} }));
vi.mock('@/server/auth/authorize', () => ({ requireAdmin: vi.fn() }));
import {
  checkStorageAccess,
  getOperationsSummary,
} from '@/server/operations/summary';
import { requireAdmin } from '@/server/auth/authorize';
import { safeAuthLog } from '@/server/observability/safe-log';
import { createPostOrderHandler } from '@/app/api/orders/route';

afterEach(() => vi.unstubAllEnvs());
describe('privacy failure paths', () => {
  it('discards authentication diagnostic strings and arguments', () => {
    const sink = vi.spyOn(console, 'warn').mockImplementation(() => {});
    safeAuthLog('error', 'CANARY_NAME', new Error('CANARY_PASSWORD'), {
      cookie: 'CANARY_COOKIE',
    });
    expect(JSON.stringify(sink.mock.calls)).not.toContain('CANARY');
  });
  it('returns a generic order error and safe event for a failing database', async () => {
    const sink = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('COMMERCIAL_ORDERS_ENABLED', 'true');
    const database = {
      transaction: vi
        .fn()
        .mockRejectedValue(new Error('CANARY_NAME CANARY_PHONE CANARY_TOKEN')),
    };
    const handler = createPostOrderHandler({
      database: database as never,
      getOrderSecuritySettings: () => ({
        rateLimitSecret: 's'.repeat(32),
        receiptTokenSecret: 't'.repeat(32),
        trustedProxyHops: 0,
      }),
      getDirectClientAddress: () => '127.0.0.1',
    });
    const response = await handler(
      new Request('http://localhost/api/orders', { method: 'POST' }),
    );
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('CANARY');
    expect(JSON.stringify(sink.mock.calls)).toContain('ORDER_SAVE_FAILED');
    expect(JSON.stringify(sink.mock.calls)).not.toContain('CANARY');
  });
  it('checks storage without creating a missing directory or following a symlink', async () => {
    const root = await mkdtemp(join(tmpdir(), 'guteli-storage-check-'));
    try {
      expect(await checkStorageAccess(root)).toBe(true);
      expect(await checkStorageAccess(join(root, 'missing'))).toBe(false);
      await symlink(root, join(root, 'link'));
      expect(await checkStorageAccess(join(root, 'link'))).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it('requires existing admin authorization before reading operational data', async () => {
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error('UNAUTHENTICATED'));
    await expect(getOperationsSummary(new Headers())).rejects.toThrow(
      'UNAUTHENTICATED',
    );
  });
});
