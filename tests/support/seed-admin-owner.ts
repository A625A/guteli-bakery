import { provisionOwner } from '@/server/auth/provision-owner';
import { pool } from '@/server/db/client';
import { requireTestDatabaseUrl } from '@/test/database-url';

import { adminAuthFixture } from './admin-auth-fixture';

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
  } finally {
    await pool.end();
  }
}

void main().catch(() => {
  process.stderr.write('Playwright owner seed failed.\n');
  process.exitCode = 1;
});
