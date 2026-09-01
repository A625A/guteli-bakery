import 'server-only';

import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';

import { auth } from '@/server/auth/auth';
import { db } from '@/server/db/client';
import { account, user } from '@/server/db/schema';

export type ProvisionOwnerInput = Readonly<{
  email: string;
  name: string;
  password: string;
}>;

const OWNER_PROVISIONING_LOCK = 4_728_519_113;
const SETUP_CREDENTIAL_TTL_MS = 24 * 60 * 60 * 1000;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateInput(input: ProvisionOwnerInput) {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();

  if (!/^\S+@\S+\.\S+$/.test(email) || !name || input.password.length < 14) {
    throw new Error('Invalid owner provisioning input.');
  }

  return { email, name };
}

/** Creates the one local bootstrap owner in one PostgreSQL transaction. */
export async function provisionOwner(
  input: ProvisionOwnerInput,
): Promise<'created' | 'exists'> {
  const { email, name } = validateInput(input);
  const context = await auth.$context;

  return db.transaction(async (transaction) => {
    await transaction.execute(
      sql`SELECT pg_advisory_xact_lock(${OWNER_PROVISIONING_LOCK})`,
    );

    const [existingUser] = await transaction
      .select({ id: user.id })
      .from(user)
      .limit(1);
    if (existingUser) return 'exists';

    const now = new Date();
    const userId = randomUUID();
    const password = await context.password.hash(input.password);
    await transaction.insert(user).values({
      id: userId,
      email,
      name,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
      role: 'OWNER',
      active: true,
      mustChangePassword: true,
      setupCredentialExpiresAt: new Date(
        now.getTime() + SETUP_CREDENTIAL_TTL_MS,
      ),
    });
    await transaction.insert(account).values({
      id: randomUUID(),
      userId,
      providerId: 'credential',
      issuer: 'local:credential',
      accountId: userId,
      password,
      createdAt: now,
      updatedAt: now,
    });

    return 'created';
  });
}
