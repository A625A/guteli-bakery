import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { parseServerEnv } from '@/server/config/env';

describe('parseServerEnv', () => {
  it('accepts the local Docker configuration', () => {
    expect(
      parseServerEnv({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://guteli:secret@database:5432/guteli',
      }).NODE_ENV,
    ).toBe('test');
  });

  it('rejects an invalid database URL', () => {
    expect(() =>
      parseServerEnv({ NODE_ENV: 'test', DATABASE_URL: 'not-a-url' }),
    ).toThrow('Invalid server environment');
  });

  it('rejects a missing database URL without exposing values', () => {
    expect(() => parseServerEnv({ NODE_ENV: 'test' })).toThrow(
      'Invalid server environment',
    );
  });
});
