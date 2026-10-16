import 'server-only';
import { constants } from 'node:fs';
import { access, lstat } from 'node:fs/promises';
import { sql } from 'drizzle-orm';
import { requireAdmin } from '@/server/auth/authorize';
import { db } from '@/server/db/client';
import { operationalChecks, outboxEvents } from '@/server/db/schema';
import { resolveUploadsRoot } from '@/server/config/uploads-root';
import { readAutomationSettings } from '@/server/notifications/automation-settings';
import {
  logOperationalEvent,
  operationalSnapshot,
} from '@/server/observability/safe-log';
import { describeOperations, type OperationalFacts } from './status';

export async function checkStorageAccess(root: string): Promise<boolean> {
  try {
    const stat = await lstat(root);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return false;
    await access(root, constants.R_OK | constants.W_OK | constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export async function getOperationsSummary(
  requestHeaders?: Headers,
  now = new Date(),
) {
  await requireAdmin(requestHeaders);
  const facts: OperationalFacts = {
    database: false,
    storage: null,
    notifications: null,
    worker: null,
    automationEnabled: false,
    localOrderFailures:
      operationalSnapshot().find((row) => row.event === 'ORDER_SAVE_FAILED')
        ?.count ?? 0,
    now,
  };
  try {
    facts.automationEnabled = readAutomationSettings() !== null;
  } catch {
    logOperationalEvent('MONITOR_UNAVAILABLE');
  }
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL statement_timeout = '1000ms'`);
      await tx.execute(sql`SELECT 1`);
      facts.database = true;
      const [counts] = await tx
        .select({
          failed: sql<number>`count(*) filter (where ${outboxEvents.state} = 'FAILED' or ${outboxEvents.lastErrorCode} = 'RETRY_LIMIT')::integer`,
          unknown: sql<number>`count(*) filter (where ${outboxEvents.deliveryStatus} = 'UNKNOWN' or (${outboxEvents.deliveryStatus} = 'SENDING' and ${outboxEvents.leaseExpiresAt} < ${now}))::integer`,
          overdue: sql<number>`count(*) filter (where ${outboxEvents.state} = 'PENDING' and ${outboxEvents.createdAt} < ${new Date(now.getTime() - 15 * 60_000)})::integer`,
        })
        .from(outboxEvents)
        .where(
          sql`${outboxEvents.eventType} IN ('OWNER_ORDER_CREATED', 'CUSTOMER_ORDER_CREATED')`,
        );
      facts.notifications = counts;
      const [worker] = await tx
        .select({
          status: operationalChecks.status,
          checkedAt: operationalChecks.checkedAt,
        })
        .from(operationalChecks);
      facts.worker = worker ?? null;
    });
  } catch {
    logOperationalEvent('MONITOR_UNAVAILABLE');
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    facts.storage = await Promise.race([
      checkStorageAccess(resolveUploadsRoot()),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), 1000);
      }),
    ]);
  } catch {
    facts.storage = false;
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (facts.storage === false) logOperationalEvent('STORAGE_UNAVAILABLE');
  return describeOperations(facts);
}
