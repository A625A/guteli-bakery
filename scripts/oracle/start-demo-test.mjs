import { cp } from 'node:fs/promises';
const database = new URL(process.env.DATABASE_URL_TEST ?? 'file:///');
if (
  database.protocol !== 'postgresql:' ||
  database.hostname !== '127.0.0.1' ||
  database.pathname !== '/guteli_test' ||
  process.env.DATABASE_URL !== process.env.DATABASE_URL_TEST ||
  process.env.COMMERCIAL_ORDERS_ENABLED !== 'false'
)
  throw new Error('Isolated demo test settings required');
await cp('public', '.next/standalone/public', { recursive: true });
await cp('.next/static', '.next/standalone/.next/static', { recursive: true });
process.env.HOSTNAME = '127.0.0.1';
process.env.PORT = '3110';
await import('../../.next/standalone/server.js');
