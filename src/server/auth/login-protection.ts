import 'server-only';

import { createHmac } from 'node:crypto';

import { and, eq, gte, sql } from 'drizzle-orm';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';
import { z } from 'zod';

import { db } from '@/server/db/client';
import { rateLimitBuckets, user } from '@/server/db/schema';
import { getTrustedClientAddress } from '@/server/security/client-subject';

const LOGIN_POLICY = 'ADMIN_LOGIN_ACCOUNT_IP';
const WINDOW_MS = 15 * 60 * 1000;
const FAILURE_LIMIT = 5;

const settingsSchema = z.object({
  RATE_LIMIT_SECRET: z.string().min(32),
  TRUSTED_PROXY_HOPS: z
    .string()
    .regex(/^(0|[1-9]\d*)$/)
    .transform(Number)
    .refine((value) => value <= 10),
});

type LoginAttemptContext = Readonly<{
  email: string;
  subject: string;
}>;

function getSettings() {
  const testDefaults =
    process.env.NODE_ENV === 'test'
      ? {
          RATE_LIMIT_SECRET:
            process.env.RATE_LIMIT_SECRET ??
            'test-login-rate-limit-secret-must-be-at-least-32-bytes',
          TRUSTED_PROXY_HOPS: process.env.TRUSTED_PROXY_HOPS ?? '0',
        }
      : process.env;
  const parsed = settingsSchema.safeParse(testDefaults);
  if (!parsed.success) throw new Error('Invalid login protection environment.');
  return parsed.data;
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : null;
}

function hmacSubject(secret: string, email: string, address: string) {
  return createHmac('sha256', secret)
    .update('guteli:admin-login-account-ip:v1\u0000')
    .update(`${email}\u0000${address}`)
    .digest('hex');
}

function windowStartedAt(now: Date) {
  return new Date(Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS);
}

function retryAfterSeconds(now: Date, start: Date) {
  return Math.max(
    1,
    Math.ceil((start.getTime() + WINDOW_MS - now.getTime()) / 1000),
  );
}

function invalidCredentials() {
  return APIError.from('UNAUTHORIZED', {
    code: 'INVALID_EMAIL_OR_PASSWORD',
    message: 'Invalid email or password',
  });
}

function requestContext(ctx: { body?: unknown; request?: Request }) {
  const body = ctx.body as { email?: unknown } | undefined;
  const email = normalizeEmail(body?.email);
  if (!email || !ctx.request) return null;

  const settings = getSettings();
  if (settings.TRUSTED_PROXY_HOPS === 0 && process.env.NODE_ENV !== 'test') {
    throw new Error('A trusted proxy is required for login protection.');
  }
  const address = getTrustedClientAddress(ctx.request, {
    trustedProxyHops: settings.TRUSTED_PROXY_HOPS,
    directAddress: process.env.NODE_ENV === 'test' ? '127.0.0.1' : null,
  });

  return {
    email,
    subject: hmacSubject(settings.RATE_LIMIT_SECRET, email, address),
  } satisfies LoginAttemptContext;
}

async function rejectIfThrottled(ctx: {
  body?: unknown;
  request?: Request;
  setHeader: (name: string, value: string) => void;
}) {
  const attempt = requestContext(ctx);
  if (!attempt) throw invalidCredentials();

  const now = new Date();
  const start = windowStartedAt(now);
  const [bucket] = await db
    .select({ count: rateLimitBuckets.count })
    .from(rateLimitBuckets)
    .where(
      and(
        eq(rateLimitBuckets.policy, LOGIN_POLICY),
        eq(rateLimitBuckets.subject, attempt.subject),
        eq(rateLimitBuckets.windowStartedAt, start),
        gte(rateLimitBuckets.count, FAILURE_LIMIT),
      ),
    )
    .limit(1);

  if (bucket) {
    throw new APIError(
      'TOO_MANY_REQUESTS',
      {
        code: 'LOGIN_THROTTLED',
        message: 'Try again later',
      },
      { 'Retry-After': String(retryAfterSeconds(now, start)) },
    );
  }

  const [candidate] = await db
    .select({
      active: user.active,
      mustChangePassword: user.mustChangePassword,
      setupCredentialExpiresAt: user.setupCredentialExpiresAt,
    })
    .from(user)
    .where(eq(user.email, attempt.email))
    .limit(1);
  if (
    candidate &&
    (!candidate.active ||
      (candidate.mustChangePassword &&
        candidate.setupCredentialExpiresAt !== null &&
        candidate.setupCredentialExpiresAt.getTime() <= now.getTime()))
  ) {
    throw invalidCredentials();
  }
}

async function recordFailedAttempt(ctx: { body?: unknown; request?: Request }) {
  const attempt = requestContext(ctx);
  if (!attempt) return;

  const now = new Date();
  const start = windowStartedAt(now);
  await db
    .insert(rateLimitBuckets)
    .values({
      policy: LOGIN_POLICY,
      subject: attempt.subject,
      windowStartedAt: start,
      count: 1,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        rateLimitBuckets.policy,
        rateLimitBuckets.subject,
        rateLimitBuckets.windowStartedAt,
      ],
      set: { count: sql`${rateLimitBuckets.count} + 1`, updatedAt: now },
    });
}

/** Better Auth plugin: its `before` hook executes before password verification. */
export function loginProtectionPlugin(): BetterAuthPlugin {
  return {
    id: 'guteli-login-protection',
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path === '/sign-in/email',
          handler: createAuthMiddleware(async (ctx) => {
            await rejectIfThrottled(ctx);
          }),
        },
      ],
      after: [
        {
          matcher: (ctx) => ctx.path === '/sign-in/email',
          handler: createAuthMiddleware(async (ctx) => {
            const returned = ctx.context.returned as
              { body?: { code?: string } } | undefined;
            if (returned?.body?.code === 'INVALID_EMAIL_OR_PASSWORD') {
              await recordFailedAttempt(ctx);
            }
          }),
        },
        {
          matcher: (ctx) => ctx.path === '/change-password',
          handler: createAuthMiddleware(async (ctx) => {
            const returned = ctx.context.returned as
              { body?: { code?: string }; user?: unknown } | undefined;
            const userId = ctx.context.session?.user?.id;
            if (returned?.user && userId) {
              await db
                .update(user)
                .set({
                  mustChangePassword: false,
                  setupCredentialExpiresAt: null,
                })
                .where(eq(user.id, userId));
            }
          }),
        },
      ],
    },
  };
}
