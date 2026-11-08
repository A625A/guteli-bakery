import type { PoolConfig } from 'pg';
import { isNetlify } from './platform';

export function databasePoolOptions(
  env: Record<string, string | undefined>,
): PoolConfig {
  return {
    connectionString: env.DATABASE_URL,
    max: isNetlify(env) ? 3 : 10,
    connectionTimeoutMillis: isNetlify(env) ? 10_000 : 750,
    idleTimeoutMillis: 10_000,
    maxLifetimeSeconds: 300,
    allowExitOnIdle: true,
  };
}

/** Migration commands only. Never substitute the direct URL in the web runtime. */
export function migrationDatabaseUrl(env: Record<string, string | undefined>) {
  const value = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
  try {
    const url = new URL(value ?? '');
    if (url.protocol !== 'postgresql:') throw new Error();
    if (
      url.hostname.endsWith('.neon.tech') &&
      (url.hostname.split('.')[0].endsWith('-pooler') ||
        !['require', 'verify-full'].includes(
          url.searchParams.get('sslmode') ?? '',
        ) ||
        url.searchParams.get('uselibpqcompat') === 'true')
    )
      throw new Error();
    return value!;
  } catch {
    throw new Error(
      'A valid direct PostgreSQL connection is required for migrations. Set DATABASE_URL_UNPOOLED for Neon.',
    );
  }
}
