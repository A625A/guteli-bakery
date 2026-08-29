import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to reset the test database.');
}

const parsed = new URL(databaseUrl);
if (parsed.protocol !== 'postgresql:' || parsed.pathname !== '/guteli_test') {
  throw new Error('Refusing to reset a database other than guteli_test.');
}

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query('DROP SCHEMA public CASCADE');
  await client.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
  await client.query('CREATE SCHEMA public');
} finally {
  await client.end();
}
