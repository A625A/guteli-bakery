import 'server-only';
import { sql } from 'drizzle-orm';
import { operationalChecks } from '@/server/db/schema';
import type { OrdersDatabase } from '@/server/orders/types';
import { logOperationalEvent } from '@/server/observability/safe-log';

export async function recordWorkerSignal(
  database: OrdersDatabase,
  status: 'ok' | 'failed',
  now = new Date(),
) {
  try {
    await database.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL statement_timeout = '1000ms'`);
      await tx
        .insert(operationalChecks)
        .values({ component: 'whatsapp_worker', status, checkedAt: now })
        .onConflictDoUpdate({
          target: operationalChecks.component,
          set: { status, checkedAt: now },
          setWhere: sql`${operationalChecks.checkedAt} <= ${now}`,
        });
    });
    return true;
  } catch {
    logOperationalEvent('MONITOR_UNAVAILABLE');
    return false;
  }
}
