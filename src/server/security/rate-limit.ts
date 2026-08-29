import { sql } from 'drizzle-orm';

import { rateLimitBuckets } from '@/server/db/schema';
import type { OrdersTransaction } from '@/server/orders/types';

export type FixedWindowRateLimit = Readonly<{
  policy: string;
  subject: string;
  limit: number;
  windowMs: number;
  now: Date;
}>;

export type FixedWindowRateLimitResult = Readonly<{
  allowed: boolean;
  retryAfterSeconds: number;
}>;

function getWindowStart(now: Date, windowMs: number) {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

function getRetryAfterSeconds(
  now: Date,
  windowStartedAt: Date,
  windowMs: number,
) {
  return Math.max(
    1,
    Math.ceil((windowStartedAt.getTime() + windowMs - now.getTime()) / 1000),
  );
}

export async function consumeFixedWindowRateLimit(
  transaction: OrdersTransaction,
  input: FixedWindowRateLimit,
): Promise<FixedWindowRateLimitResult> {
  const windowStartedAt = getWindowStart(input.now, input.windowMs);
  const [bucket] = await transaction
    .insert(rateLimitBuckets)
    .values({
      policy: input.policy,
      subject: input.subject,
      windowStartedAt,
      count: 1,
      updatedAt: input.now,
    })
    .onConflictDoUpdate({
      target: [
        rateLimitBuckets.policy,
        rateLimitBuckets.subject,
        rateLimitBuckets.windowStartedAt,
      ],
      set: {
        count: sql`${rateLimitBuckets.count} + 1`,
        updatedAt: input.now,
      },
      setWhere: sql`${rateLimitBuckets.count} < ${input.limit}`,
    })
    .returning({ count: rateLimitBuckets.count });

  return {
    allowed: bucket !== undefined,
    retryAfterSeconds: getRetryAfterSeconds(
      input.now,
      windowStartedAt,
      input.windowMs,
    ),
  };
}
