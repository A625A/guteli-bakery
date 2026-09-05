import { randomUUID } from 'node:crypto';

import { base32 } from '@better-auth/utils/base32';
import { createOTP } from '@better-auth/utils/otp';
import { hashPassword } from 'better-auth/crypto';
import { expect, test, type Page } from '@playwright/test';
import { Pool } from 'pg';

import { requireTestDatabaseUrl } from '../../src/test/database-url';

test.describe.configure({ mode: 'serial' });

const ownerFixture = {
  email: 'browser-users-owner@example.test',
  name: 'Propietaria de usuarios',
  setupPassword: 'users-owner-setup-password-at-least-14',
  password: 'users-owner-replacement-password-at-least-14',
} as const;

const adminFixture = {
  email: 'browser-users-admin@example.test',
  name: 'Administradora sin usuarios',
  setupPassword: 'users-admin-setup-password-at-least-14',
  password: 'users-admin-replacement-password-at-least-14',
} as const;

test.beforeAll(async () => {
  const databaseUrl = requireTestDatabaseUrl(
    process.env.DATABASE_URL_TEST,
    'admin users browser tests',
  );
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    for (const fixture of [ownerFixture, adminFixture]) {
      const userId = randomUUID();
      const password = await hashPassword(fixture.setupPassword);
      await pool.query(
        `INSERT INTO "user" (
          id, name, email, email_verified, role, active,
          must_change_password, setup_credential_expires_at
        ) VALUES ($1, $2, $3, true, $4, true, true, $5)`,
        [
          userId,
          fixture.name,
          fixture.email,
          fixture === ownerFixture ? 'OWNER' : 'ADMIN',
          new Date(Date.now() + 24 * 60 * 60 * 1_000),
        ],
      );
      await pool.query(
        `INSERT INTO account (
          id, issuer, account_id, provider_id, user_id, password,
          created_at, updated_at
        ) VALUES (
          $1, 'local:credential', $2::text, 'credential', $2::uuid, $3,
          now(), now()
        )`,
        [randomUUID(), userId, password],
      );
    }
  } finally {
    await pool.end();
  }
});

async function completeFirstLogin(
  page: Page,
  fixture: {
    email: string;
    setupPassword: string;
    password: string;
  },
) {
  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill(fixture.email);
  await page.getByLabel('Contraseña').fill(fixture.setupPassword);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(
    page.getByRole('heading', { name: 'Cambia tu contraseña' }),
  ).toBeVisible();
  await page.getByLabel('Contraseña actual').fill(fixture.setupPassword);
  await page.getByLabel('Nueva contraseña').fill(fixture.password);
  const passwordChangeResponse = page.waitForResponse((response) =>
    response.url().includes('/api/auth/change-password'),
  );
  await page.getByRole('button', { name: 'Actualizar contraseña' }).click();
  expect((await passwordChangeResponse).status()).toBe(200);
  await expect(
    page.getByRole('heading', { name: 'Configura tu autenticador' }),
  ).toBeVisible({ timeout: 10_000 });
  await page.getByLabel('Contraseña actual').fill(fixture.password);
  await page.getByRole('button', { name: 'Configurar autenticador' }).click();
  const totpUri = await page.locator('output').textContent();
  expect(totpUri).toBeTruthy();
  const encodedSecret = new URL(totpUri!).searchParams.get('secret');
  expect(encodedSecret).toBeTruthy();
  const secret = new TextDecoder().decode(base32.decode(encodedSecret!));
  await page
    .getByLabel('Código de verificación')
    .fill(await createOTP(secret).totp());
  await page
    .getByLabel('Guardé los códigos de recuperación en un lugar seguro.')
    .check();
  await page.getByRole('button', { name: 'Verificar código' }).click();
  await expect(
    page.getByRole('heading', { name: 'Panel administrativo' }),
  ).toBeVisible();
}

test('the Users navigation and page are hidden from regular admins', async ({
  page,
}) => {
  await completeFirstLogin(page, adminFixture);
  const navigation = page.getByRole('navigation', { name: 'Administración' });
  await expect(navigation.getByRole('link', { name: 'Usuarios' })).toHaveCount(
    0,
  );

  await page.goto('/admin/users');
  await expect(
    page.getByRole('heading', { name: 'Página administrativa no encontrada' }),
  ).toBeVisible();
});

test('an owner creates an admin whose one-time credential requires replacement and TOTP enrollment', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await completeFirstLogin(page, ownerFixture);
  const navigation = page.getByRole('navigation', { name: 'Administración' });
  await navigation.getByRole('link', { name: 'Usuarios' }).click();
  await expect(
    page.getByRole('heading', { name: 'Usuarios administrativos' }),
  ).toBeVisible();

  const email = 'browser-created-admin@example.test';
  await page.getByLabel('Nombre').fill('Administradora creada');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByRole('button', { name: 'Crear administradora' }).click();
  const credentialOutput = page.locator(
    'output[aria-label="Credencial temporal"]',
  );
  await expect(credentialOutput).toBeVisible();
  const setupCredential = await credentialOutput.textContent();
  expect(setupCredential?.length).toBeGreaterThanOrEqual(14);
  expect(page.url()).not.toContain(setupCredential!);
  expect(
    await page.evaluate(
      (credential) =>
        Object.values(localStorage).includes(credential) ||
        Object.values(sessionStorage).includes(credential),
      setupCredential,
    ),
  ).toBe(false);

  await page.goto('/admin');
  await page.getByRole('button', { name: 'Cerrar esta sesión' }).click();
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(setupCredential!);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(
    page.getByRole('heading', { name: 'Cambia tu contraseña' }),
  ).toBeVisible();

  const replacement = 'browser-created-replacement-at-least-14';
  await page.getByLabel('Contraseña actual').fill(setupCredential!);
  await page.getByLabel('Nueva contraseña').fill(replacement);
  const passwordChangeResponse = page.waitForResponse((response) =>
    response.url().includes('/api/auth/change-password'),
  );
  await page.getByRole('button', { name: 'Actualizar contraseña' }).click();
  expect((await passwordChangeResponse).status()).toBe(200);
  await expect(
    page.getByRole('heading', { name: 'Configura tu autenticador' }),
  ).toBeVisible({ timeout: 10_000 });
  await page.goto('/admin');
  await expect(
    page.getByRole('heading', { name: 'Configura tu autenticador' }),
  ).toBeVisible();

  await page.getByLabel('Contraseña actual').fill(replacement);
  await page.getByRole('button', { name: 'Configurar autenticador' }).click();
  const totpUri = await page.locator('output').textContent();
  const encodedSecret = new URL(totpUri!).searchParams.get('secret');
  const secret = new TextDecoder().decode(base32.decode(encodedSecret!));
  await page
    .getByLabel('Código de verificación')
    .fill(await createOTP(secret).totp());
  await page
    .getByLabel('Guardé los códigos de recuperación en un lugar seguro.')
    .check();
  await page.getByRole('button', { name: 'Verificar código' }).click();
  await expect(
    page.getByRole('heading', { name: 'Panel administrativo' }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Administración' })
      .getByRole('link', { name: 'Usuarios' }),
  ).toHaveCount(0);
});
