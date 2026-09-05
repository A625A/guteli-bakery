import 'server-only';

import { randomBytes, randomUUID } from 'node:crypto';

import { and, asc, count, eq, gt, sql } from 'drizzle-orm';

import { db } from '@/server/db/client';
import { account, auditLogs, session, user } from '@/server/db/schema';
import { requireTrustedMutationOrigin } from '@/server/security/origin';

import {
  AuthorizationError,
  requireOwner,
  type AuthorizedActor,
} from './authorize';
import {
  assertRecentReauthentication,
  MAX_REAUTHENTICATION_AGE_SECONDS,
} from './reauth';

export type AdminUserMutation =
  | { kind: 'CREATE'; email: string; name: string; role: 'ADMIN' }
  | { kind: 'SET_ACTIVE'; userId: string; active: boolean }
  | { kind: 'SET_ROLE'; userId: string; role: 'OWNER' | 'ADMIN' };

export type AdminUserDto = Readonly<{
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'ADMIN';
  active: boolean;
  twoFactorEnabled: boolean;
  mustChangePassword: boolean;
  setupCredentialExpiresAt: string | null;
  createdAt: string;
}>;

export type AdminUserErrorCode =
  | 'ADMIN_EMAIL_EXISTS'
  | 'ADMIN_USER_NOT_FOUND'
  | 'LAST_ACTIVE_OWNER'
  | 'SELF_DISABLE_FORBIDDEN'
  | 'WEAK_SETUP_CREDENTIAL';

export class AdminUserError extends Error {
  readonly code: AdminUserErrorCode;

  constructor(code: AdminUserErrorCode) {
    super(code);
    this.name = 'AdminUserError';
    this.code = code;
  }
}

type AdminUserState = Readonly<{
  role: 'OWNER' | 'ADMIN';
  active: boolean;
}>;

type CreateAdminUserDependencies = Readonly<{
  generateSetupCredential?: () => string;
  now?: () => Date;
}>;

const ADMIN_USER_MUTATION_LOCK = 4_728_519_114;
const SETUP_CREDENTIAL_TTL_MS = 24 * 60 * 60 * 1_000;
const MINIMUM_SETUP_CREDENTIAL_LENGTH = 14;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toDto(candidate: {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'ADMIN';
  active: boolean;
  twoFactorEnabled: boolean | null;
  mustChangePassword: boolean;
  setupCredentialExpiresAt: Date | null;
  createdAt: Date;
}): AdminUserDto {
  return {
    id: candidate.id,
    email: candidate.email,
    name: candidate.name,
    role: candidate.role,
    active: candidate.active,
    twoFactorEnabled: candidate.twoFactorEnabled === true,
    mustChangePassword: candidate.mustChangePassword,
    setupCredentialExpiresAt:
      candidate.setupCredentialExpiresAt?.toISOString() ?? null,
    createdAt: candidate.createdAt.toISOString(),
  };
}

function safeState(candidate: AdminUserState): AdminUserState {
  return { role: candidate.role, active: candidate.active };
}

function setupCredential() {
  return `Guteli-${randomBytes(18).toString('base64url')}`;
}

function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  if ('code' in error && error.code === '23505') return true;
  return (
    'cause' in error &&
    !!error.cause &&
    typeof error.cause === 'object' &&
    'code' in error.cause &&
    error.cause.code === '23505'
  );
}

async function initialMutationActor(requestHeaders: Headers) {
  requireTrustedMutationOrigin(requestHeaders);
  return assertRecentReauthentication(
    await requireOwner(requestHeaders),
    MAX_REAUTHENTICATION_AGE_SECONDS,
  );
}

async function lockAndRevalidateActor(
  transaction: Parameters<Parameters<typeof db.transaction>[0]>[0],
  actor: AuthorizedActor,
  now: Date,
) {
  await transaction.execute(
    sql`SELECT pg_advisory_xact_lock(${ADMIN_USER_MUTATION_LOCK})`,
  );
  const [current] = await transaction
    .select({
      active: user.active,
      role: user.role,
      expiresAt: session.expiresAt,
      mfaVerifiedAt: session.mfaVerifiedAt,
    })
    .from(user)
    .innerJoin(
      session,
      and(eq(session.id, actor.sessionId), eq(session.userId, user.id)),
    )
    .where(
      and(
        eq(user.id, actor.userId),
        eq(user.active, true),
        eq(user.role, 'OWNER'),
        gt(session.expiresAt, now),
      ),
    )
    .limit(1);

  if (!current) throw new AuthorizationError('FORBIDDEN');
  if (!current.mfaVerifiedAt) throw new AuthorizationError('MFA_REQUIRED');
  assertRecentReauthentication(
    { ...actor, role: current.role, mfaVerifiedAt: current.mfaVerifiedAt },
    MAX_REAUTHENTICATION_AGE_SECONDS,
    now,
  );
}

async function writeAudit(
  transaction: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: {
    actorId: string;
    targetId: string;
    action:
      | 'ADMIN_USER_CREATED'
      | 'ADMIN_USER_ROLE_CHANGED'
      | 'ADMIN_USER_ACTIVE_CHANGED';
    requestId: string;
    before: AdminUserState | null;
    after: AdminUserState;
  },
) {
  await transaction.insert(auditLogs).values({
    actorId: input.actorId,
    action: input.action,
    entityType: 'ADMIN_USER',
    entityId: input.targetId,
    requestId: input.requestId,
    metadata: { before: input.before, after: input.after },
  });
}

export async function listAdminUsers(
  requestHeaders: Headers,
  pagination: Readonly<{ page: number; pageSize: number }> = {
    page: 1,
    pageSize: 25,
  },
) {
  await requireOwner(requestHeaders);
  if (
    !Number.isInteger(pagination.page) ||
    pagination.page < 1 ||
    !Number.isInteger(pagination.pageSize) ||
    pagination.pageSize < 1 ||
    pagination.pageSize > 100
  ) {
    throw new RangeError('Invalid admin user pagination.');
  }

  const [users, [{ value: total }]] = await Promise.all([
    db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        active: user.active,
        twoFactorEnabled: user.twoFactorEnabled,
        mustChangePassword: user.mustChangePassword,
        setupCredentialExpiresAt: user.setupCredentialExpiresAt,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(asc(user.email), asc(user.id))
      .limit(pagination.pageSize)
      .offset((pagination.page - 1) * pagination.pageSize),
    db.select({ value: count() }).from(user),
  ]);

  return {
    users: users.map(toDto),
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
  } as const;
}

export async function createAdminUser(
  mutation: Extract<AdminUserMutation, { kind: 'CREATE' }>,
  requestHeaders: Headers,
  requestId: string,
  dependencies: CreateAdminUserDependencies = {},
) {
  const actor = await initialMutationActor(requestHeaders);
  const credential =
    dependencies.generateSetupCredential?.() ?? setupCredential();
  if (credential.length < MINIMUM_SETUP_CREDENTIAL_LENGTH) {
    throw new AdminUserError('WEAK_SETUP_CREDENTIAL');
  }

  const now = dependencies.now?.() ?? new Date();
  const email = normalizeEmail(mutation.email);
  const name = mutation.name.trim();
  const expiresAt = new Date(now.getTime() + SETUP_CREDENTIAL_TTL_MS);
  const authContext = await (await import('./auth')).auth.$context;
  const passwordHash = await authContext.password.hash(credential);

  try {
    const created = await db.transaction(async (transaction) => {
      await lockAndRevalidateActor(transaction, actor, now);
      const userId = randomUUID();
      const [createdUser] = await transaction
        .insert(user)
        .values({
          id: userId,
          email,
          name,
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
          role: 'ADMIN',
          active: true,
          mustChangePassword: true,
          setupCredentialExpiresAt: expiresAt,
        })
        .returning({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          active: user.active,
          twoFactorEnabled: user.twoFactorEnabled,
          mustChangePassword: user.mustChangePassword,
          setupCredentialExpiresAt: user.setupCredentialExpiresAt,
          createdAt: user.createdAt,
        });
      await transaction.insert(account).values({
        id: randomUUID(),
        issuer: 'local:credential',
        accountId: userId,
        providerId: 'credential',
        userId,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });
      await writeAudit(transaction, {
        actorId: actor.userId,
        targetId: userId,
        action: 'ADMIN_USER_CREATED',
        requestId,
        before: null,
        after: safeState(createdUser),
      });
      return createdUser;
    });

    return {
      user: toDto(created),
      setupCredential: credential,
      setupCredentialExpiresAt: expiresAt.toISOString(),
    } as const;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AdminUserError('ADMIN_EMAIL_EXISTS');
    }
    throw error;
  }
}

export async function updateAdminUser(
  mutation: Exclude<AdminUserMutation, { kind: 'CREATE' }>,
  requestHeaders: Headers,
  requestId: string,
) {
  const actor = await initialMutationActor(requestHeaders);
  const now = new Date();

  return db.transaction(async (transaction) => {
    await lockAndRevalidateActor(transaction, actor, now);
    const [target] = await transaction
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        active: user.active,
        twoFactorEnabled: user.twoFactorEnabled,
        mustChangePassword: user.mustChangePassword,
        setupCredentialExpiresAt: user.setupCredentialExpiresAt,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, mutation.userId))
      .for('update')
      .limit(1);
    if (!target) throw new AdminUserError('ADMIN_USER_NOT_FOUND');

    const before = safeState(target);
    const next: AdminUserState =
      mutation.kind === 'SET_ACTIVE'
        ? { role: target.role, active: mutation.active }
        : { role: mutation.role, active: target.active };

    if (
      mutation.kind === 'SET_ACTIVE' &&
      mutation.userId === actor.userId &&
      mutation.active === false
    ) {
      throw new AdminUserError('SELF_DISABLE_FORBIDDEN');
    }

    if (
      target.role === 'OWNER' &&
      target.active &&
      (next.role !== 'OWNER' || !next.active)
    ) {
      const [{ value: activeOwnerCount }] = await transaction
        .select({ value: count() })
        .from(user)
        .where(and(eq(user.role, 'OWNER'), eq(user.active, true)));
      if (activeOwnerCount <= 1) {
        throw new AdminUserError('LAST_ACTIVE_OWNER');
      }
    }

    const [updated] = await transaction
      .update(user)
      .set({
        ...(mutation.kind === 'SET_ACTIVE'
          ? { active: mutation.active }
          : { role: mutation.role }),
        updatedAt: now,
      })
      .where(eq(user.id, target.id))
      .returning({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        active: user.active,
        twoFactorEnabled: user.twoFactorEnabled,
        mustChangePassword: user.mustChangePassword,
        setupCredentialExpiresAt: user.setupCredentialExpiresAt,
        createdAt: user.createdAt,
      });

    if (
      (mutation.kind === 'SET_ACTIVE' && mutation.active === false) ||
      (mutation.kind === 'SET_ROLE' && mutation.role !== target.role)
    ) {
      await transaction.delete(session).where(eq(session.userId, target.id));
    }
    await writeAudit(transaction, {
      actorId: actor.userId,
      targetId: target.id,
      action:
        mutation.kind === 'SET_ACTIVE'
          ? 'ADMIN_USER_ACTIVE_CHANGED'
          : 'ADMIN_USER_ROLE_CHANGED',
      requestId,
      before,
      after: safeState(updated),
    });

    return { user: toDto(updated) } as const;
  });
}
