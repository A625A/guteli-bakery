import 'server-only';

import { eq } from 'drizzle-orm';

import { auth } from '@/server/auth/auth';
import { db, pool } from '@/server/db/client';
import { user } from '@/server/db/schema';

export type ProvisionOwnerInput = Readonly<{
  email: string;
  name: string;
  password: string;
}>;

const OWNER_PROVISIONING_LOCK = 4_728_519_113;

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

/**
 * Creates the one local bootstrap owner. The PostgreSQL advisory lock spans
 * Better Auth's official user and credential adapter calls, making the
 * no-user check and creation atomic across concurrent CLI processes.
 */
export async function provisionOwner(
  input: ProvisionOwnerInput,
): Promise<'created' | 'exists'> {
  const { email, name } = validateInput(input);
  const connection = await pool.connect();

  try {
    await connection.query('SELECT pg_advisory_lock($1)', [
      OWNER_PROVISIONING_LOCK,
    ]);

    const [existingUser] = await db.select({ id: user.id }).from(user).limit(1);
    if (existingUser) return 'exists';

    const context = await auth.$context;
    const provisionedUser = await context.internalAdapter.createUser(
      {
        email,
        name,
        emailVerified: true,
        role: 'OWNER',
        active: true,
        mustChangePassword: false,
        setupCredentialExpiresAt: null,
      },
      { method: 'admin' },
    );

    try {
      await context.internalAdapter.linkAccount({
        userId: provisionedUser.id,
        providerId: 'credential',
        issuer: 'local:credential',
        accountId: provisionedUser.id,
        password: await context.password.hash(input.password),
      });
    } catch (error) {
      await db.delete(user).where(eq(user.id, provisionedUser.id));
      throw error;
    }

    return 'created';
  } finally {
    await connection
      .query('SELECT pg_advisory_unlock($1)', [OWNER_PROVISIONING_LOCK])
      .catch(() => undefined);
    connection.release();
  }
}
