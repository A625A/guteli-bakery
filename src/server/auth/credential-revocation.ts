import 'server-only';

import { createHash, randomUUID } from 'node:crypto';

import type { GenericEndpointContext } from '@better-auth/core';
import { and, eq, inArray, like, ne, or } from 'drizzle-orm';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';
import { deleteSessionCookie, expireCookie } from 'better-auth/cookies';

import { db } from '@/server/db/client';
import { account, session, user, verification } from '@/server/db/schema';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type CredentialVersion = Readonly<{
  userId: string;
  epoch: string;
  fingerprint: string;
}>;
type ChallengeVersion = CredentialVersion & { completedSessionId?: string };
type RequestState = {
  credential?: CredentialVersion;
  challenge?: string;
  userId?: string;
};

const EPOCH_PREFIX = 'guteli:credential-epoch:';
const CHALLENGE_PREFIX = 'guteli:challenge-version:';
const MFA_PATHS = new Set([
  '/two-factor/verify-totp',
  '/two-factor/verify-backup-code',
]);
const REVOCATION_PATHS = new Set([
  '/change-password',
  '/revoke-sessions',
  '/revoke-other-sessions',
]);

function invalidCredentials() {
  return APIError.from('UNAUTHORIZED', {
    code: 'INVALID_EMAIL_OR_PASSWORD',
    message: 'Invalid email or password',
  });
}

async function lockUser(transaction: Transaction, userId: string) {
  const [stored] = await transaction
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, userId))
    .for('update');
  if (!stored) throw invalidCredentials();
}

async function credentialVersion(transaction: Transaction, userId: string) {
  const [credential] = await transaction
    .select({ password: account.password })
    .from(account)
    .where(
      and(eq(account.userId, userId), eq(account.providerId, 'credential')),
    )
    .limit(1);
  if (!credential?.password) throw invalidCredentials();
  const [epoch] = await transaction
    .select({ value: verification.value })
    .from(verification)
    .where(eq(verification.identifier, `${EPOCH_PREFIX}${userId}`))
    .limit(1);
  return {
    userId,
    epoch: epoch?.value ?? 'initial',
    fingerprint: createHash('sha256').update(credential.password).digest('hex'),
  } satisfies CredentialVersion;
}

function serializeVersion(version: ChallengeVersion) {
  return [
    version.userId,
    version.epoch,
    version.fingerprint,
    version.completedSessionId ?? '',
  ].join('|');
}

function parseVersion(value: string): ChallengeVersion | null {
  const [userId, epoch, fingerprint, completedSessionId, extra] =
    value.split('|');
  if (!userId || !epoch || !fingerprint || extra !== undefined) return null;
  return {
    userId,
    epoch,
    fingerprint,
    completedSessionId: completedSessionId || undefined,
  };
}

function sameVersion(left: CredentialVersion, right: CredentialVersion) {
  return (
    left.userId === right.userId &&
    left.epoch === right.epoch &&
    left.fingerprint === right.fingerprint
  );
}

async function storedChallenge(transaction: Transaction, identifier: string) {
  const [stored] = await transaction
    .select({ value: verification.value, expiresAt: verification.expiresAt })
    .from(verification)
    .where(eq(verification.identifier, `${CHALLENGE_PREFIX}${identifier}`))
    .limit(1);
  if (!stored || stored.expiresAt.getTime() <= Date.now()) return null;
  return parseVersion(stored.value);
}

async function deleteChallenge(transaction: Transaction, identifier: string) {
  await transaction
    .delete(verification)
    .where(
      inArray(verification.identifier, [
        identifier,
        `2fa-attempts-${identifier}`,
        `${CHALLENGE_PREFIX}${identifier}`,
      ]),
    );
}

async function revokeCredentials(
  transaction: Transaction,
  userId: string,
  keepSessionId?: string,
) {
  // All issuance/completion/revocation finalizers hold the same user row lock.
  await transaction
    .delete(verification)
    .where(eq(verification.identifier, `${EPOCH_PREFIX}${userId}`));
  await transaction.insert(verification).values({
    identifier: `${EPOCH_PREFIX}${userId}`,
    value: randomUUID(),
    expiresAt: new Date('9999-01-01T00:00:00.000Z'),
  });
  const pending = await transaction
    .select({ identifier: verification.identifier })
    .from(verification)
    .where(
      and(
        eq(verification.value, userId),
        like(verification.identifier, '2fa-%'),
      ),
    );
  await transaction.delete(verification).where(
    or(
      and(
        eq(verification.value, userId),
        like(verification.identifier, '2fa-%'),
      ),
      and(
        like(verification.identifier, `${CHALLENGE_PREFIX}%`),
        like(verification.value, `${userId}|%`),
      ),
      ...(pending.length
        ? [
            inArray(
              verification.identifier,
              pending.map(({ identifier }) => `2fa-attempts-${identifier}`),
            ),
          ]
        : []),
    ),
  );
  await transaction
    .delete(session)
    .where(
      and(
        eq(session.userId, userId),
        ...(keepSessionId ? [ne(session.id, keepSessionId)] : []),
      ),
    );
}

function expireChallengeCookies(ctx: GenericEndpointContext) {
  expireCookie(ctx, ctx.context.createAuthCookie('two_factor'));
  expireCookie(ctx, ctx.context.createAuthCookie('admin_login_subject'));
}

async function rejectNewSession(ctx: GenericEndpointContext) {
  const created = ctx.context.newSession?.session;
  if (created) await db.delete(session).where(eq(session.id, created.id));
  ctx.context.setNewSession(null);
  deleteSessionCookie(ctx);
  expireChallengeCookies(ctx);
  throw invalidCredentials();
}

function responseChallenge(ctx: GenericEndpointContext) {
  const name = ctx.context.createAuthCookie('two_factor').name;
  const responseHeaders = (
    ctx.context as typeof ctx.context & { responseHeaders?: Headers }
  ).responseHeaders;
  for (const cookie of responseHeaders?.getSetCookie() ?? []) {
    if (!cookie.startsWith(`${name}=`)) continue;
    const raw = decodeURIComponent(
      cookie.slice(name.length + 1).split(';', 1)[0] ?? '',
    );
    const identifier = raw.slice(0, raw.lastIndexOf('.'));
    if (/^2fa-[a-zA-Z0-9_-]+$/.test(identifier)) return identifier;
  }
  return null;
}

/** Register after login protection so its finalizer also checks issued MFA sessions. */
export function credentialRevocationPlugin(): BetterAuthPlugin {
  const requests = new WeakMap<Request, RequestState>();
  return {
    id: 'guteli-credential-revocation',
    hooks: {
      before: [
        {
          matcher: (ctx) =>
            Boolean(ctx.request) &&
            (ctx.path === '/sign-in/email' ||
              ctx.path === '/sign-out' ||
              MFA_PATHS.has(ctx.path ?? '') ||
              REVOCATION_PATHS.has(ctx.path ?? '')),
          handler: createAuthMiddleware(async (ctx) => {
            if (!ctx.request) return;
            const state: RequestState = {};
            requests.set(ctx.request, state);
            if (ctx.path === '/sign-in/email') {
              const email = (ctx.body as { email?: unknown } | undefined)
                ?.email;
              if (typeof email !== 'string') return;
              const [candidate] = await db
                .select({ id: user.id })
                .from(user)
                .where(eq(user.email, email.trim().toLowerCase()))
                .limit(1);
              if (candidate)
                state.credential = await db.transaction(async (transaction) => {
                  await lockUser(transaction, candidate.id);
                  return credentialVersion(transaction, candidate.id);
                });
              return;
            }
            const token = await ctx.getSignedCookie(
              ctx.context.authCookies.sessionToken.name,
              ctx.context.secret,
            );
            const current = token
              ? await ctx.context.internalAdapter.findSession(token)
              : null;
            state.userId = current?.user.id;
            if (ctx.path === '/change-password') {
              return {
                context: { body: { ...ctx.body, revokeOtherSessions: true } },
              };
            }
            const identifier = await ctx.getSignedCookie(
              ctx.context.createAuthCookie('two_factor').name,
              ctx.context.secret,
            );
            if (identifier && /^2fa-[a-zA-Z0-9_-]+$/.test(identifier)) {
              state.challenge = identifier;
              state.credential = await db
                .transaction((transaction) =>
                  storedChallenge(transaction, identifier),
                )
                .then((version) => version ?? undefined);
            }
            // Enrollment has an authenticated pre-MFA session; sign-in challenges do not.
            if (MFA_PATHS.has(ctx.path ?? '') && !current && !state.credential)
              throw invalidCredentials();
          }),
        },
      ],
      after: [
        {
          matcher: (ctx) =>
            Boolean(ctx.request) &&
            (ctx.path === '/sign-in/email' ||
              ctx.path === '/sign-out' ||
              MFA_PATHS.has(ctx.path ?? '') ||
              REVOCATION_PATHS.has(ctx.path ?? '')),
          handler: createAuthMiddleware(async (ctx) => {
            if (!ctx.request) return;
            const state = requests.get(ctx.request);
            requests.delete(ctx.request);
            const returned = ctx.context.returned as
              | {
                  user?: unknown;
                  status?: boolean;
                  success?: boolean;
                  twoFactorRedirect?: boolean;
                }
              | undefined;
            if (!state || returned instanceof APIError) return;
            if (
              ctx.path === '/sign-in/email' &&
              (returned?.twoFactorRedirect || ctx.context.newSession)
            ) {
              const captured = state.credential;
              if (!captured) return rejectNewSession(ctx);
              const identifier = responseChallenge(ctx);
              if (returned?.twoFactorRedirect && !identifier)
                return rejectNewSession(ctx);
              const accepted = await db.transaction(async (transaction) => {
                await lockUser(transaction, captured.userId);
                if (
                  !sameVersion(
                    captured,
                    await credentialVersion(transaction, captured.userId),
                  )
                ) {
                  if (identifier)
                    await deleteChallenge(transaction, identifier);
                  return false;
                }
                if (identifier) {
                  const [challenge] = await transaction
                    .select({ expiresAt: verification.expiresAt })
                    .from(verification)
                    .where(
                      and(
                        eq(verification.identifier, identifier),
                        eq(verification.value, captured.userId),
                      ),
                    )
                    .limit(1);
                  if (!challenge) return false;
                  await transaction.insert(verification).values({
                    identifier: `${CHALLENGE_PREFIX}${identifier}`,
                    value: serializeVersion(captured),
                    expiresAt: challenge.expiresAt,
                  });
                }
                return true;
              });
              if (!accepted) return rejectNewSession(ctx);
            } else if (
              MFA_PATHS.has(ctx.path ?? '') &&
              ctx.context.newSession?.session &&
              state.challenge
            ) {
              const created = ctx.context.newSession.session;
              const captured = state.credential;
              const accepted =
                captured &&
                (await db.transaction(async (transaction) => {
                  await lockUser(transaction, captured.userId);
                  const marker = await storedChallenge(
                    transaction,
                    state.challenge!,
                  );
                  if (
                    !marker ||
                    !sameVersion(marker, captured) ||
                    !sameVersion(
                      captured,
                      await credentialVersion(transaction, captured.userId),
                    )
                  )
                    return false;
                  await transaction
                    .update(verification)
                    .set({
                      value: serializeVersion({
                        ...captured,
                        completedSessionId: created.id,
                      }),
                    })
                    .where(
                      eq(
                        verification.identifier,
                        `${CHALLENGE_PREFIX}${state.challenge}`,
                      ),
                    );
                  return true;
                }));
              if (!accepted) return rejectNewSession(ctx);
            } else if (
              REVOCATION_PATHS.has(ctx.path ?? '') &&
              state.userId &&
              (returned?.user || returned?.status === true)
            ) {
              const keep =
                ctx.path === '/change-password'
                  ? ctx.context.newSession?.session.id
                  : ctx.path === '/revoke-other-sessions'
                    ? ctx.context.session?.session.id
                    : undefined;
              await db.transaction(async (transaction) => {
                await lockUser(transaction, state.userId!);
                await revokeCredentials(transaction, state.userId!, keep);
              });
              expireChallengeCookies(ctx);
            } else if (ctx.path === '/sign-out' && returned?.success === true) {
              if (state.challenge && state.credential)
                await db.transaction(async (transaction) => {
                  await lockUser(transaction, state.credential!.userId);
                  const marker = await storedChallenge(
                    transaction,
                    state.challenge!,
                  );
                  if (marker?.completedSessionId)
                    await transaction
                      .delete(session)
                      .where(
                        and(
                          eq(session.id, marker.completedSessionId),
                          eq(session.userId, marker.userId),
                        ),
                      );
                  await deleteChallenge(transaction, state.challenge!);
                });
              expireChallengeCookies(ctx);
            }
          }),
        },
      ],
    },
  };
}
