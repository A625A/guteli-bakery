import 'server-only';

import type { BetterAuthRateLimitStorage } from '@better-auth/core';
import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/server/db/client';
import { rateLimitBuckets } from '@/server/db/schema';
import { createHmacSubject } from '@/server/security/client-subject';
import { logOperationalEvent } from '@/server/observability/safe-log';
import type { OrdersDatabase } from '@/server/orders/types';

const POLICY = 'ADMIN_AUTH_ENDPOINT';
const BUCKET = new Date(0);

/** Atomic rolling windows shared by all Netlify instances; identifiers stay hashed. */
export function createAuthRateLimitStorage(
  database: OrdersDatabase = db,
): BetterAuthRateLimitStorage {
  return {
    async consume(key, rule) {
      const secret =
        process.env.RATE_LIMIT_SECRET ??
        (process.env.NODE_ENV === 'test'
          ? 'test-login-rate-limit-secret-must-be-at-least-32-bytes'
          : undefined);
      if (!secret || Buffer.byteLength(secret) < 32) {
        throw new Error('Invalid authentication rate limit secret.');
      }
      const subject = createHmacSubject(secret, 'auth-endpoint-rate', key);
      const now = new Date();
      const cutoff = new Date(now.getTime() - rule.window * 1000);
      const [reserved] = await database
        .insert(rateLimitBuckets)
        .values({
          policy: POLICY,
          subject,
          windowStartedAt: BUCKET,
          count: 1,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            rateLimitBuckets.policy,
            rateLimitBuckets.subject,
            rateLimitBuckets.windowStartedAt,
          ],
          set: {
            count: sql`CASE WHEN ${rateLimitBuckets.updatedAt} <= ${cutoff} THEN 1 ELSE ${rateLimitBuckets.count} + 1 END`,
            updatedAt: now,
          },
          setWhere: sql`${rateLimitBuckets.updatedAt} <= ${cutoff} OR ${rateLimitBuckets.count} < ${rule.max}`,
        })
        .returning({ id: rateLimitBuckets.id });
      if (reserved) return { allowed: true, retryAfter: null };
      const [current] = await database
        .select({ updatedAt: rateLimitBuckets.updatedAt })
        .from(rateLimitBuckets)
        .where(
          and(
            eq(rateLimitBuckets.policy, POLICY),
            eq(rateLimitBuckets.subject, subject),
          ),
        )
        .limit(1);
      logOperationalEvent('AUTH_THROTTLED');
      return {
        allowed: false,
        retryAfter: Math.max(
          1,
          Math.ceil(
            ((current?.updatedAt.getTime() ?? now.getTime()) +
              rule.window * 1000 -
              now.getTime()) /
              1000,
          ),
        ),
      };
    },
  };
}

export const authRateLimitStorage = createAuthRateLimitStorage();
