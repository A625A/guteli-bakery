import { randomUUID } from 'node:crypto';

import { provisionOwner } from '@/server/auth/provision-owner';
import { auth } from '@/server/auth/auth';
import { db, pool } from '@/server/db/client';
import { account, user } from '@/server/db/schema';
import { requireTestDatabaseUrl } from '@/test/database-url';

import {
  adminAuthFixture,
  adminCatalogAuthFixture,
  adminOrdersAuthFixture,
  adminShellAuthFixture,
} from './admin-auth-fixture';

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
    const authContext = await auth.$context;
    for (const fixture of [
      { ...adminShellAuthFixture, role: 'ADMIN' as const },
      { ...adminCatalogAuthFixture, role: 'OWNER' as const },
      { ...adminOrdersAuthFixture, role: 'OWNER' as const },
    ]) {
      const userId = randomUUID();
      const passwordHash = await authContext.password.hash(
        fixture.setupPassword,
      );
      await db.transaction(async (tx) => {
        await tx.insert(user).values({
          id: userId,
          email: fixture.email,
          name: fixture.name,
          role: fixture.role,
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
    }
  } finally {
    await pool.end();
  }
}

void main().catch(() => {
  process.stderr.write('Playwright owner seed failed.\n');
  process.exitCode = 1;
});
