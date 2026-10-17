import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { requireTestDatabaseUrl } from '../../src/test/database-url';
import { expect, test } from '@playwright/test';
import { base32 } from '@better-auth/utils/base32';
import { createOTP } from '@better-auth/utils/otp';
import { mkdirSync } from 'node:fs';
import { adminUxAuthFixture } from '../support/admin-auth-fixture';
test.beforeAll(async () => {
  const pool = new Pool({
    connectionString: requireTestDatabaseUrl(
      process.env.DATABASE_URL_TEST,
      'admin UX browser fixtures',
    ),
  });
  try {
    const products = await pool.query(
      'SELECT p.id,p.name,p.price_minor,p.sale_unit,c.name AS category FROM products p JOIN categories c ON p.category_id=c.id WHERE p.deleted_at IS NULL AND p.active=true ORDER BY p.sort_order LIMIT 5',
    );
    for (let i = 0; i < 24; i++) {
      const p = products.rows[i % products.rows.length];
      const status = [
        'RECEIVED',
        'CONFIRMED',
        'PREPARING',
        'READY',
        'OUT_FOR_DELIVERY',
        'COMPLETED',
        'CANCELLED',
      ][i % 7];
      const quantity = (i % 3) + 1;
      const delivery = i % 3 === 0;
      const created = new Date(Date.now() - (i % 7) * 86400000 - 1000);
      const total = p.price_minor * quantity;
      const order = await pool.query(
        `INSERT INTO orders(public_id,customer_name,phone,fulfillment,requested_date,delivery_location,subtotal_minor,shipping_minor,total_minor,receipt_token_hash,created_at,order_status,terminal_at) VALUES($1,$2,'55550000',$3,CURRENT_DATE+1,$4,$5,0,$5,$6,$7,$8,$9) RETURNING id`,
        [
          'GUT-26-UX' + String(i).padStart(6, '0'),
          'Cliente ficticio ' + (i + 1),
          delivery ? 'DELIVERY' : 'PICKUP',
          delivery ? 'Dirección de prueba' : null,
          total,
          randomUUID(),
          created,
          status,
          ['COMPLETED', 'CANCELLED'].includes(status) ? created : null,
        ],
      );
      await pool.query(
        `INSERT INTO order_items(order_id,source_product_id,product_name,category_label,sale_unit,unit_price_minor,quantity,line_total_minor) VALUES($1,$2,$3,$4,$8,$5,$6,$7)`,
        [
          order.rows[0].id,
          p.id,
          p.name,
          p.category,
          p.price_minor,
          quantity,
          total,
          p.sale_unit,
        ],
      );
    }
    await pool.query(
      "INSERT INTO promotions(name,scope,discount_bps,starts_at,ends_at,enabled) VALUES('Oferta ficticia de temporada','CATALOG',1000,now()-interval '1 day',now()+interval '7 days',true)",
    );
    const retired = await pool.query(
      "INSERT INTO products(category_id,name,slug,price_minor,active,deleted_at) SELECT category_id,'Retirado ficticio','retirado-ficticio',1000,false,now() FROM products LIMIT 1 RETURNING id",
    );
    const offer = await pool.query(
      "INSERT INTO promotions(name,scope,discount_bps,starts_at,ends_at,enabled) VALUES('Selección ficticia','SELECTED',500,now()-interval '1 day',now()+interval '7 days',false) RETURNING id",
    );
    for (const id of [products.rows[0].id, retired.rows[0].id])
      await pool.query(
        'INSERT INTO promotion_products(promotion_id,product_id) VALUES($1,$2)',
        [offer.rows[0].id, id],
      );
  } finally {
    await pool.end();
  }
});
test('owner can navigate, edit in a drawer, and use the mobile panel', async ({
  page,
}) => {
  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill(adminUxAuthFixture.email);
  await page.getByLabel('Contraseña').fill(adminUxAuthFixture.setupPassword);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page
    .getByLabel('Contraseña actual')
    .fill(adminUxAuthFixture.setupPassword);
  await page.getByLabel('Nueva contraseña').fill(adminUxAuthFixture.password);
  const passwordChangeResponse = page.waitForResponse((response) =>
    response.url().includes('/api/auth/change-password'),
  );
  await page.getByRole('button', { name: 'Actualizar contraseña' }).click();
  expect((await passwordChangeResponse).status()).toBe(200);
  await expect(
    page.getByRole('heading', { name: 'Configura tu autenticador' }),
  ).toBeVisible();
  await page.getByLabel('Contraseña actual').fill(adminUxAuthFixture.password);
  const enableResponse = page.waitForResponse((response) =>
    response.url().includes('/api/auth/two-factor/enable'),
  );
  await page.getByRole('button', { name: 'Configurar autenticador' }).click();
  expect((await enableResponse).status()).toBe(200);
  const totpUri = await page.locator('output').textContent();
  const encoded = new URL(totpUri!).searchParams.get('secret');
  const secret = new TextDecoder().decode(base32.decode(encoded!));
  await page
    .getByLabel('Código de verificación')
    .fill(await createOTP(secret).totp());
  await page
    .getByLabel('Guardé los códigos de recuperación en un lugar seguro.')
    .check();
  const verifyResponse = page.waitForResponse((response) =>
    response.url().includes('/api/auth/two-factor/verify-totp'),
  );
  await page.getByRole('button', { name: 'Verificar código' }).click();
  expect((await verifyResponse).status()).toBe(200);
  await expect(
    page.getByRole('heading', { name: 'Panel administrativo' }),
  ).toBeVisible();

  test.setTimeout(300000);
  const browserErrors: string[] = [];
  async function auditEditor(name: string, width: number) {
    await page.evaluate(
      readFileSync(
        createRequire(process.cwd() + '/package.json').resolve(
          'axe-core/axe.min.js',
        ),
        'utf8',
      ),
    );
    const result = await page.evaluate(async () =>
      (
        window as unknown as {
          axe: { run: () => Promise<{ violations: unknown[] }> };
        }
      ).axe.run(),
    );
    expect(result.violations).toEqual([]);
    writeFileSync(
      `artifacts/admin-ux-2/after/a11y-${name}-${width}.json`,
      JSON.stringify({ violations: result.violations }),
    );
  }
  page.on('pageerror', (error) => browserErrors.push(error.message));
  const stage = process.env.ADMIN_UX_BASELINE ? 'before' : 'after';
  const directory = `artifacts/admin-ux-2/${stage}`;
  mkdirSync(directory, { recursive: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      '',
      '/products',
      '/categories',
      '/orders',
      '/orders/GUT-26-UX000000',
      '/promotions',
      '/users',
    ]) {
      await page.goto(`/admin${route}`);
      await page.locator('main h1').waitFor();
      if (!route && !process.env.ADMIN_UX_BASELINE)
        await expect(
          page.getByRole('heading', { name: 'Productos más solicitados' }),
        ).toBeVisible();
      await page.evaluate(() => {
        const label = document.createElement('div');
        label.textContent = 'DATOS FICTICIOS · ENTORNO DE PRUEBA';
        label.style.cssText =
          'position:fixed;bottom:4px;right:4px;z-index:100;font:10px sans-serif;padding:4px 8px;background:#fff8e8;color:#59371e;border:1px solid #c9986f;border-radius:4px';
        document.body.append(label);
      });
      await page.addStyleTag({ content: 'nextjs-portal{display:none}' });
      await page.waitForLoadState('networkidle');
      await page.screenshot({
        path: `${directory}/${route.slice(1).replaceAll('/', '-') || 'dashboard'}-${width}.png`,
        fullPage: true,
      });
      if (!process.env.ADMIN_UX_BASELINE) {
        const axeSource = readFileSync(
          createRequire(process.cwd() + '/package.json').resolve(
            'axe-core/axe.min.js',
          ),
          'utf8',
        );
        await page.evaluate(axeSource);
        const results = await page.evaluate(async () => {
          const axe = (
            window as unknown as {
              axe: {
                run: (
                  context: unknown,
                  options: unknown,
                ) => Promise<{
                  violations: {
                    id: string;
                    impact: string;
                    nodes: unknown[];
                  }[];
                }>;
              };
            }
          ).axe;
          return axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
          });
        });
        writeFileSync(
          `${directory}/a11y-${route.slice(1).replaceAll('/', '-') || 'dashboard'}-${width}.json`,
          JSON.stringify(results, null, 2),
        );
        expect(results.violations).toEqual([]);
      }
      if (!process.env.ADMIN_UX_BASELINE) {
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
      }
    }
  }
  if (process.env.ADMIN_UX_BASELINE) return;
  await page.goto('/admin/products');
  await page
    .getByRole('button', { name: 'Agregar producto', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Agregar producto', exact: true }),
  ).toBeFocused();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [route, trigger, name] of [
      ['products', 'Agregar producto', 'product-create'],
      ['categories', 'Agregar categoría', 'category-create'],
      ['promotions', 'Agregar promoción', 'promotion-create'],
    ]) {
      await page.goto('/admin/' + route);
      await page.getByRole('button', { name: trigger, exact: true }).click();
      await page.addStyleTag({ content: 'nextjs-portal{display:none}' });
      await page.waitForLoadState('networkidle');
      await page.screenshot({
        path: `${directory}/${name}-${width}.png`,
        fullPage: false,
      });
      await auditEditor(name, width);
      await page.keyboard.press('Escape');
    }
    await page.goto('/admin/products');
    await page
      .getByRole('button', { name: /^Editar / })
      .first()
      .click();
    await page.addStyleTag({ content: 'nextjs-portal{display:none}' });
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: `${directory}/product-edit-${width}.png`,
      fullPage: false,
    });
    await auditEditor('product-edit', width);
    await page.keyboard.press('Escape');
  }
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ['categories', 'promotions']) {
      await page.goto('/admin/' + route);
      await page
        .getByRole('button', { name: /^Editar / })
        .first()
        .click();
      await page.evaluate(
        readFileSync(
          createRequire(process.cwd() + '/package.json').resolve(
            'axe-core/axe.min.js',
          ),
          'utf8',
        ),
      );
      const results = await page.evaluate(async () =>
        (
          window as unknown as {
            axe: { run: () => Promise<{ violations: unknown[] }> };
          }
        ).axe.run(),
      );
      expect(results.violations).toEqual([]);
      writeFileSync(
        `${directory}/a11y-${route}-editor-${width}.json`,
        JSON.stringify({ violations: results.violations }),
      );
      await page.waitForLoadState('networkidle');
      await page.screenshot({
        path: `${directory}/${route}-edit-${width}.png`,
        fullPage: false,
      });
      await page.keyboard.press('Escape');
    }
    await page.goto('/admin/users');
    await page.getByText('Agregar administradora', { exact: true }).click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: `${directory}/users-create-${width}.png`,
      fullPage: true,
    });
    await auditEditor('users-create', width);
    await page.goto('/admin/products/00000000-0000-4000-8000-000000000001');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: `${directory}/product-direct-${width}.png`,
      fullPage: true,
    });
  }
  // Server filters use the real catalogue, including literal search characters.
  await page.goto('/admin/products?search=Originales&sort=price');
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.goto('/admin/products?search=%25');
  await expect(
    page.getByText('No hay productos que coincidan.', { exact: false }),
  ).toBeVisible();
  await page.goto('/admin/products?state=retired');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody')).toContainText('Retirado ficticio');
  // Real mutations, failures, pending fields, dirty dismissal and restoration.
  await page.goto('/admin/products');
  await page
    .getByRole('button', { name: /^Editar / })
    .first()
    .click();
  const editor = page.getByRole('dialog');
  const productName = editor.getByLabel('Nombre del producto');
  const original = await productName.inputValue();
  await productName.fill(original + ' de prueba');
  page.once('dialog', (d) => d.dismiss());
  await page.keyboard.press('Escape');
  await expect(editor).toBeVisible();
  await page.route('**/api/admin/products/*', (route) =>
    route.fulfill({
      status: 503,
      json: { error: { message: 'No se pudo guardar el producto.' } },
    }),
  );
  await editor
    .getByRole('button', { name: 'Guardar cambios', exact: true })
    .click();
  await expect(editor.getByRole('status')).toContainText('No se pudo');
  await expect(productName).toHaveValue(original + ' de prueba');
  await page.unroute('**/api/admin/products/*');
  let release!: () => void;
  const held = new Promise<void>((r) => {
    release = r;
  });
  await page.route('**/api/admin/products/*', async (route) => {
    await held;
    await route.continue();
  });
  await editor
    .getByRole('button', { name: 'Guardar cambios', exact: true })
    .click();
  await expect(productName).toBeDisabled();
  release();
  await expect(editor.getByRole('status')).toContainText(
    'Producto actualizado',
  );
  await page.unroute('**/api/admin/products/*');
  await productName.fill(original);
  await editor
    .getByRole('button', { name: 'Guardar cambios', exact: true })
    .click();
  await expect(productName).toBeEnabled();
  await expect(editor.getByRole('status')).toContainText(
    'Producto actualizado',
  );
  await page.keyboard.press('Escape');
  await expect(editor).not.toBeVisible();
  await page.goto('/admin/promotions');
  await page
    .getByRole('button', { name: 'Editar Selección ficticia', exact: true })
    .click();
  await editor
    .getByRole('button', { name: 'Quitar selección', exact: true })
    .click();
  page.once('dialog', (d) => d.dismiss());
  await page.keyboard.press('Escape');
  await expect(editor).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Editar Selección ficticia', exact: true })
    .click();
  await editor
    .getByLabel('Buscar productos para la promoción')
    .fill('no coincide');
  await expect(
    editor.getByText('2 productos seleccionados', { exact: true }),
  ).toBeVisible();
  await editor.getByLabel('Buscar productos para la promoción').fill('');
  await editor
    .getByRole('button', {
      name: 'Quitar productos retirados (1)',
      exact: true,
    })
    .click();
  await editor
    .getByRole('button', { name: 'Guardar cambios', exact: true })
    .click();
  await expect(editor.getByRole('status')).toContainText('Promoción guardada');
  await page.keyboard.press('Escape');
  await expect(editor).not.toBeVisible();
  await page.goto('/admin/categories');
  await page
    .getByRole('button', { name: /^Editar / })
    .first()
    .click();
  const categoryName = editor.locator('input[name=name]');
  const initialName = await categoryName.inputValue();
  await categoryName.fill(initialName + ' pendiente');
  page.once('dialog', (d) => d.accept());
  await editor.getByRole('button', { name: /^Desactivar / }).click();
  await expect(editor.getByRole('status')).toContainText(
    'Categoría desactivada',
  );
  page.once('dialog', (d) => d.dismiss());
  await page.keyboard.press('Escape');
  await expect(editor).toBeVisible();
  await categoryName.fill(initialName);
  await editor.getByLabel('Activa', { exact: true }).check();
  await editor
    .getByRole('button', { name: 'Guardar cambios', exact: true })
    .click();
  await expect(editor.getByRole('status')).toContainText(
    'Categoría actualizada',
  );
  await page.keyboard.press('Escape');
  await page.goto('/admin');
  await page
    .getByRole('combobox', { name: 'Período', exact: true })
    .selectOption('custom');
  for (const from of ['2026-10-01', '2026-10-02']) {
    await page.getByLabel('Desde', { exact: true }).fill(from);
    await page.getByLabel('Hasta', { exact: true }).fill('2026-10-03');
    await page.getByRole('button', { name: 'Consultar', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Productos más solicitados' }),
    ).toBeVisible();
  }
  await page.goBack();
  await expect(page.getByLabel('Desde', { exact: true })).toHaveValue(
    '2026-10-01',
  );
  await expect(
    page.getByRole('heading', { name: 'Productos más solicitados' }),
  ).toBeVisible();
  await expect(
    page.getByText('Sin pedidos en este período.', { exact: true }),
  ).toBeVisible();
  await page.route('**/api/admin/analytics?**', (route) =>
    route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE' } } }),
  );
  await page.getByRole('button', { name: 'Consultar', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'No se pudieron consultar las estadísticas',
  );
  await expect(
    page.getByText('Sin pedidos en este período.', { exact: true }),
  ).not.toBeVisible();
  await page.unroute('**/api/admin/analytics?**');
  await page.getByRole('button', { name: 'Consultar', exact: true }).click();
  await expect(
    page.getByText('Sin pedidos en este período.', { exact: true }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      '',
      '/products',
      '/categories',
      '/orders',
      '/promotions',
      '/users',
    ]) {
      await page.goto('/admin' + route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/admin/products');
  await page.getByRole('button', { name: 'Menú administrativo' }).click();
  await expect(
    page.getByRole('link', { name: 'Resumen', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Resumen', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Menú administrativo' }),
  ).toHaveAttribute('aria-expanded', 'false');
});
