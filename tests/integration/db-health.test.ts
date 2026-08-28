import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { checkDatabaseConnection } from '@/server/db/health';

describe('checkDatabaseConnection', () => {
  it('reports an available PostgreSQL database', async () => {
    await expect(checkDatabaseConnection()).resolves.toEqual({ database: 'up' });
  });
});
