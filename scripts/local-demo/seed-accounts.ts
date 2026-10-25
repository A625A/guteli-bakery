import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { auth } from '@/server/auth/auth';
import { db, pool } from '@/server/db/client';
import { account, user } from '@/server/db/schema';

async function main() {
  const root = resolve(process.env.GUTELI_LOCAL_DEMO_ROOT ?? '.local-demo');
  const state = JSON.parse(await readFile(`${root}/state.json`, 'utf8'));
  const url = new URL(process.env.DATABASE_URL ?? 'file:///');
  if (
    process.env.GUTELI_LOCAL_DEMO_ROOT !== root ||
    state.repo !== process.cwd() ||
    url.hostname !== '127.0.0.1' ||
    url.port !== '55461' ||
    url.pathname !== '/guteli_test' ||
    process.env.COMMERCIAL_ORDERS_ENABLED !== 'false'
  )
    throw new Error('Demo aislada requerida');
  const marker = await pool.query(
    "SELECT shobj_description(oid, 'pg_database') AS marker FROM pg_database WHERE datname=current_database()",
  );
  if (marker.rows[0]?.marker !== 'guteli-demo-fixtures-v1')
    throw new Error('Base no marcada');
  if (process.argv.includes('--renew-setup')) {
    const result = await pool.query(
      `UPDATE "user" SET setup_credential_expires_at=now()+interval '24 hours'
       WHERE email IN ('owner-demo@example.test','admin-demo@example.test')
       AND must_change_password=true RETURNING role`,
    );
    console.log(
      `${result.rowCount} accesos iniciales DEMO renovados por 24 horas; cuentas ya configuradas sin cambios.`,
    );
    return;
  }
  const context = await auth.$context;
  for (const role of ['OWNER', 'ADMIN'] as const) {
    const id = randomUUID();
    const password = await context.password.hash(
      state[`${role.toLowerCase()}_password`],
    );
    await db.transaction(async (tx) => {
      await tx.insert(user).values({
        id,
        name: `${role} DEMO`,
        email: `${role.toLowerCase()}-demo@example.test`,
        role,
        active: true,
        emailVerified: true,
        mustChangePassword: true,
        setupCredentialExpiresAt: new Date(Date.now() + 86400000),
      });
      await tx.insert(account).values({
        id: randomUUID(),
        userId: id,
        accountId: id,
        issuer: 'local:credential',
        providerId: 'credential',
        password,
      });
    });
  }
}
main()
  .finally(() => pool.end())
  .catch(() => {
    console.error('No se prepararon las cuentas DEMO.');
    process.exitCode = 1;
  });
