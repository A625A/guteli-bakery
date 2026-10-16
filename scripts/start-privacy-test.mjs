import { cp } from 'node:fs/promises';

let database;
try {
  database = new URL(process.env.DATABASE_URL_TEST ?? 'file:///');
} catch {
  throw new Error('Invalid privacy test database configuration.');
}
if (
  database.protocol !== 'postgresql:' ||
  database.pathname !== '/guteli_test' ||
  !['localhost', '127.0.0.1'].includes(database.hostname) ||
  process.env.DATABASE_URL !== process.env.DATABASE_URL_TEST
)
  throw new Error(
    'Privacy tests require an isolated local guteli_test database.',
  );

// Standalone output requires its static assets alongside the server bundle.
await cp('public', '.next/standalone/public', { recursive: true });
await cp('.next/static', '.next/standalone/.next/static', { recursive: true });
process.env.HOSTNAME = '127.0.0.1';
process.env.PORT = '3103';
await import('../.next/standalone/server.js');
