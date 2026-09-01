import 'server-only';

import { createHmac } from 'node:crypto';

import type { GenericEndpointContext } from '@better-auth/core';
import { and, asc, eq, gte, lt, ne, sql } from 'drizzle-orm';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';
import { deleteSessionCookie, expireCookie } from 'better-auth/cookies';
import { z } from 'zod';

import { db } from '@/server/db/client';
import { rateLimitBuckets, session, user } from '@/server/db/schema';
import { getTrustedClientAddress } from '@/server/security/client-subject';

const LOGIN_POLICY = 'ADMIN_LOGIN_ACCOUNT_IP';
const WINDOW_MS = 15 * 60 * 1000;
const FAILURE_LIMIT = 5;
const SUBJECT_COOKIE = 'admin_login_subject';
const SUBJECT_COOKIE_MAX_AGE_SECONDS = 10 * 60;
const SUBJECT_PATTERN = /^[a-f0-9]{64}$/;

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

function retryAfterSeconds(now: Date, oldestFailure: Date) {
  return Math.max(
    1,
    Math.ceil((oldestFailure.getTime() + WINDOW_MS - now.getTime()) / 1000),
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
  const cutoff = new Date(now.getTime() - WINDOW_MS);
  const buckets = await db
    .select({
      count: rateLimitBuckets.count,
      windowStartedAt: rateLimitBuckets.windowStartedAt,
    })
    .from(rateLimitBuckets)
    .where(
      and(
        eq(rateLimitBuckets.policy, LOGIN_POLICY),
        eq(rateLimitBuckets.subject, attempt.subject),
        gte(rateLimitBuckets.windowStartedAt, cutoff),
      ),
    )
    .orderBy(asc(rateLimitBuckets.windowStartedAt));

  const failureCount = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  if (failureCount >= FAILURE_LIMIT) {
    throw new APIError(
      'TOO_MANY_REQUESTS',
      {
        code: 'LOGIN_THROTTLED',
        message: 'Try again later',
      },
      {
        'Retry-After': String(
          retryAfterSeconds(now, buckets[0]?.windowStartedAt ?? now),
        ),
      },
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
    await recordFailedAttempt(ctx);
    throw invalidCredentials();
  }
}

async function recordFailedAttempt(ctx: { body?: unknown; request?: Request }) {
  const attempt = requestContext(ctx);
  if (!attempt) return;

  const now = new Date();
  const cutoff = new Date(now.getTime() - WINDOW_MS);
  await db
    .delete(rateLimitBuckets)
    .where(
      and(
        eq(rateLimitBuckets.policy, LOGIN_POLICY),
        eq(rateLimitBuckets.subject, attempt.subject),
        lt(rateLimitBuckets.windowStartedAt, cutoff),
      ),
    );
  await db
    .insert(rateLimitBuckets)
    .values({
      policy: LOGIN_POLICY,
      subject: attempt.subject,
      windowStartedAt: now,
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

async function rememberAttemptSubject(ctx: GenericEndpointContext) {
  const attempt = requestContext(ctx);
  if (!attempt) return;
  const secret = ctx.context.secret;
  if (!secret) throw new Error('Missing Better Auth secret.');
  const cookie = ctx.context.createAuthCookie(SUBJECT_COOKIE, {
    maxAge: SUBJECT_COOKIE_MAX_AGE_SECONDS,
  });
  await ctx.setSignedCookie(
    cookie.name,
    attempt.subject,
    secret,
    cookie.attributes,
  );
}

async function completeMfa(ctx: GenericEndpointContext) {
  const current = ctx.context.newSession?.session;
  if (!current) return;
  const secret = ctx.context.secret;
  if (!secret) throw new Error('Missing Better Auth secret.');
  const completedEnrollment = Boolean(ctx.context.session?.session);

  const now = new Date();
  const eligible = await db.transaction(async (transaction) => {
    const [currentUser] = await transaction
      .select({
        active: user.active,
        mustChangePassword: user.mustChangePassword,
        setupCredentialExpiresAt: user.setupCredentialExpiresAt,
      })
      .from(user)
      .where(eq(user.id, current.userId))
      .limit(1)
      .for('update');
    if (
      !currentUser ||
      !currentUser.active ||
      (currentUser.mustChangePassword &&
        currentUser.setupCredentialExpiresAt !== null &&
        currentUser.setupCredentialExpiresAt.getTime() <= now.getTime())
    ) {
      await transaction
        .delete(session)
        .where(eq(session.userId, current.userId));
      return false;
    }

    await transaction
      .update(session)
      .set({ mfaVerifiedAt: now })
      .where(eq(session.id, current.id));
    if (completedEnrollment) {
      await transaction
        .delete(session)
        .where(
          and(eq(session.userId, current.userId), ne(session.id, current.id)),
        );
    }
    return true;
  });

  const cookie = ctx.context.createAuthCookie(SUBJECT_COOKIE, {
    maxAge: SUBJECT_COOKIE_MAX_AGE_SECONDS,
  });
  if (!eligible) {
    ctx.context.setNewSession(null);
    deleteSessionCookie(ctx);
    expireCookie(ctx, cookie);
    throw invalidCredentials();
  }
  const subject = await ctx.getSignedCookie(cookie.name, secret);
  if (subject && SUBJECT_PATTERN.test(subject)) {
    await db
      .delete(rateLimitBuckets)
      .where(
        and(
          eq(rateLimitBuckets.policy, LOGIN_POLICY),
          eq(rateLimitBuckets.subject, subject),
        ),
      );
  }
  expireCookie(ctx, cookie);
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
              return;
            }
            if (!(returned instanceof APIError))
              await rememberAttemptSubject(ctx);
          }),
        },
        {
          matcher: (ctx) =>
            ctx.path === '/two-factor/verify-totp' ||
            ctx.path === '/two-factor/verify-backup-code',
          handler: createAuthMiddleware(async (ctx) => {
            await completeMfa(ctx);
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
