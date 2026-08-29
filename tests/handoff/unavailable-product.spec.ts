import { Client } from 'pg';
import { expect, test } from '@playwright/test';

import { requireTestDatabaseUrl } from '../../src/test/database-url';
import {
  cleanupHandoffDatabase,
  type HandoffSetupState,
} from '../support/handoff-cleanup';

const pretzelOriginalId = '00000000-0000-4000-8000-000000000001';
const databaseUrl = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'unavailable product browser regression',
);
const database = new Client({ connectionString: databaseUrl });
const setupState: HandoffSetupState = {
  databaseConnected: false,
  originalStockCaptured: false,
  mutationAttempted: false,
  mutationSucceeded: false,
};
let originalStock: number | null = null;

test.beforeAll(async () => {
  await database.connect();
  setupState.databaseConnected = true;
  const result = await database.query<{ stock_quantity: number | null }>(
    'SELECT stock_quantity FROM products WHERE id = $1',
    [pretzelOriginalId],
  );
  if (result.rowCount !== 1) {
    throw new Error('Expected the seeded Originales product.');
  }

  originalStock = result.rows[0].stock_quantity;
  setupState.originalStockCaptured = true;
  setupState.mutationAttempted = true;
  await database.query('UPDATE products SET stock_quantity = 0 WHERE id = $1', [
    pretzelOriginalId,
  ]);
  setupState.mutationSucceeded = true;
});

test.afterAll(async () => {
  await cleanupHandoffDatabase({
    state: setupState,
    restore: async () => {
      await database.query(
        'UPDATE products SET stock_quantity = $1 WHERE id = $2',
        [originalStock, pretzelOriginalId],
      );
    },
    close: () => database.end(),
  });
});

test('renders an unavailable DTO card that cannot add to a cart', async ({
  page,
}) => {
  await page.goto('/menu/');

  const card = page
    .getByTestId('product-card')
    .filter({ hasText: 'Originales' });
  await expect(
    card.getByRole('button', {
      name: 'Producto no disponible: Originales de Pretzels',
    }),
  ).toBeDisabled();
  await expect(
    card.getByRole('spinbutton', {
      name: 'Cantidad de Originales, Pretzels',
    }),
  ).toBeDisabled();
  await expect(
    card.getByText('Producto no disponible en este momento.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Carrito, 0 productos' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => window.localStorage.getItem('guteli-cart-v2')),
    )
    .toBe('[]');
});
