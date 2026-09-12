import { sql } from 'drizzle-orm';

import type { db } from '@/server/db/client';

type CatalogTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const CATALOG_MUTATION_LOCK = 4_728_519_206;

export async function acquireCatalogMutationLock(
  transaction: CatalogTransaction,
) {
  await transaction.execute(
    sql`SELECT pg_advisory_xact_lock(${CATALOG_MUTATION_LOCK})`,
  );
}
