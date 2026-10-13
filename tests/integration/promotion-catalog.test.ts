import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.hoisted(() => {
  process.env.UPLOADS_ROOT = '/private/tmp/guteli-promotion-tests';
});
import {
  categories,
  products,
  promotions,
  promotionProducts,
} from '@/server/db/schema';
import { findPublicProducts } from '@/server/products/repository';
import { requireTestDatabaseUrl } from '@/test/database-url';

const pool = new Pool({
  connectionString: requireTestDatabaseUrl(
    process.env.DATABASE_URL_TEST,
    'promotion catalog',
  ),
});
const database = drizzle({ client: pool });
beforeEach(async () => {
  await pool.query(
    'DROP SCHEMA public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public',
  );
  await migrate(database, { migrationsFolder: join(process.cwd(), 'drizzle') });
});
afterAll(() => pool.end());
it('serves highest current discounts and automatically removes expired promotions without updating base prices', async () => {
  const [category] = await database
    .insert(categories)
    .values({ name: 'Pan', slug: 'pan' })
    .returning();
  const [first, second] = await database
    .insert(products)
    .values([
      { categoryId: category.id, name: 'Uno', slug: 'uno', priceMinor: 10000 },
      { categoryId: category.id, name: 'Dos', slug: 'dos', priceMinor: 10000 },
    ])
    .returning();
  await database.insert(promotions).values({
    name: 'Todo',
    scope: 'CATALOG',
    discountBps: 2000,
    startsAt: new Date('2026-10-08T06:00Z'),
    endsAt: new Date('2026-10-10T06:00Z'),
  });
  const [selected] = await database
    .insert(promotions)
    .values({
      name: 'Especial',
      scope: 'SELECTED',
      discountBps: 7000,
      startsAt: new Date('2026-10-08T06:00Z'),
      endsAt: new Date('2026-10-09T06:00Z'),
    })
    .returning();
  await database
    .insert(promotionProducts)
    .values({ promotionId: selected.id, productId: first.id });
  const active = await findPublicProducts(
    database,
    undefined,
    () => new Date('2026-10-08T12:00Z'),
  );
  expect(active.find((p) => p.id === first.id)).toMatchObject({
    priceMinor: 3000,
    originalPriceMinor: 10000,
    promotion: { name: 'Especial', discountBps: 7000 },
  });
  expect(active.find((p) => p.id === second.id)?.priceMinor).toBe(8000);
  const expired = await findPublicProducts(
    database,
    undefined,
    () => new Date('2026-10-10T06:00Z'),
  );
  expect(expired.map((p) => p.priceMinor)).toEqual([10000, 10000]);
  expect(expired.every((p) => p.promotion === null)).toBe(true);
});
