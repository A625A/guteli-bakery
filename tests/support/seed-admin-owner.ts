import { randomUUID } from 'node:crypto';

import { provisionOwner } from '@/server/auth/provision-owner';
import { auth } from '@/server/auth/auth';
import { db, pool } from '@/server/db/client';
import { account, user } from '@/server/db/schema';
import { requireTestDatabaseUrl } from '@/test/database-url';

import { adminAuthFixture, adminShellAuthFixture } from './admin-auth-fixture';

const databaseUrl = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'Playwright admin owner seed',
);
if (process.env.DATABASE_URL !== databaseUrl) {
  throw new Error('Playwright owner seed requires the guarded test database.');
}

async function main() {
  try {
    await provisionOwner({
      email: adminAuthFixture.email,
      name: adminAuthFixture.name,
      password: adminAuthFixture.setupPassword,
    });
    const userId = randomUUID();
    const authContext = await auth.$context;
    const passwordHash = await authContext.password.hash(
      adminShellAuthFixture.setupPassword,
    );
    await db.transaction(async (tx) => {
      await tx.insert(user).values({
        id: userId,
        email: adminShellAuthFixture.email,
        name: adminShellAuthFixture.name,
        role: 'ADMIN',
        mustChangePassword: true,
        setupCredentialExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000),
      });
      await tx.insert(account).values({
        id: randomUUID(),
        issuer: 'local:credential',
        accountId: userId,
        providerId: 'credential',
        userId,
        password: passwordHash,
      });
    });
  } finally {
    await pool.end();
  }
}

void main().catch(() => {
  process.stderr.write('Playwright owner seed failed.\n');
  process.exitCode = 1;
});
