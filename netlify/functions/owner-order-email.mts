import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { databasePoolOptions } from '../../src/server/config/database';
import { readEmailSettings } from '../../src/server/notifications/email-settings';
import { processNextOwnerEmail } from '../../src/server/notifications/email-worker';

/** Netlify invokes this schedule internally; it is not a public email-trigger URL. */
export default async function handler() {
  // Previews/local development never send, even when someone copies production flags.
  if (
    process.env.CONTEXT !== 'production' ||
    process.env.DEPLOYMENT_PLATFORM !== 'netlify'
  )
    return new Response(null, { status: 204 });
  const settings = readEmailSettings();
  if (!settings) return new Response(null, { status: 204 });
  if (!process.env.DATABASE_URL) throw new Error('Email database unavailable');
  const pool = new Pool({
    ...databasePoolOptions(process.env),
    max: 1,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 5_000,
  });
  // One request (8s provider timeout) per invocation fits Netlify's 30s scheduler budget.
  try {
    await processNextOwnerEmail({
      database: drizzle({ client: pool }),
      settings,
    });
    return new Response(null, { status: 204 });
  } catch {
    // A failed invocation is visible in Netlify. The durable lease survives and can retry.
    throw new Error('Owner email processing failed');
  } finally {
    await pool.end();
  }
}

export const config = { schedule: '* * * * *' };
