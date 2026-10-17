import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { beforeAll, afterAll, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/server/auth/authorize', () => ({
  requireAdmin: vi.fn(async () => ({ role: 'OWNER' })),
}));
import { getAdminAnalytics } from '@/server/admin/analytics';
import { parseAdminPeriod } from '@/lib/admin-period';
import { requireTestDatabaseUrl } from '@/test/database-url';
const pool = new Pool({
  connectionString: requireTestDatabaseUrl(
    process.env.DATABASE_URL_TEST,
    'analytics integration',
  ),
});
const period = parseAdminPeriod(
  { period: 'custom', from: '2026-10-01', to: '2026-10-03' },
  new Date('2026-10-15T18:00:00Z'),
);
beforeAll(async () => {
  await pool.query(
    'DROP SCHEMA public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public',
  );
  await migrate(drizzle(pool), {
    migrationsFolder: join(process.cwd(), 'drizzle'),
  });
});
afterAll(async () => {
  await pool.end();
});
it('returns honest empty aggregates', async () => {
  const d = await getAdminAnalytics(period);
  expect(d.received).toBe(0);
  expect(d.products).toEqual([]);
  expect(d.daily.map((x) => x.count)).toEqual([0, 0, 0]);
});
it('counts each order once, sums repeated quantities, excludes cancellations/refunds from rankings and keeps snapshots', async () => {
  const c = await pool.query(
    "INSERT INTO categories(name,slug) VALUES('Current category','current') RETURNING id",
  );
  const p = await pool.query(
    "INSERT INTO products(category_id,name,slug,price_minor) VALUES($1,'Current product','current',2000) RETURNING id",
    [c.rows[0].id],
  );
  for (const [i, status, payment, time, quantity] of [
    [0, 'RECEIVED', 'UNPAID', '2026-10-01T05:59:59Z', 99],
    [1, 'RECEIVED', 'UNPAID', '2026-10-01T06:00:00Z', 2],
    [2, 'COMPLETED', 'UNPAID', '2026-10-02T06:00:00Z', 3],
    [3, 'CANCELLED', 'UNPAID', '2026-10-02T07:00:00Z', 40],
    [4, 'COMPLETED', 'REFUNDED', '2026-10-03T08:00:00Z', 50],
    [5, 'RECEIVED', 'UNPAID', '2026-10-04T06:00:00Z', 100],
  ] as const) {
    const o = await pool.query(
      `INSERT INTO orders(public_id,customer_name,phone,fulfillment,requested_date,subtotal_minor,shipping_minor,total_minor,receipt_token_hash,created_at,order_status,payment_status,terminal_at) VALUES($1,'Ficticio','55550000','PICKUP','2026-10-20',2000,0,2000,$2,$3,$4,$5,$6) RETURNING id`,
      [
        'GUT-26-ANALYT' + i,
        randomUUID(),
        time,
        status,
        payment,
        ['COMPLETED', 'CANCELLED'].includes(status) ? time : null,
      ],
    );
    for (let line = 0; line < (i === 1 ? 2 : 1); line++)
      await pool.query(
        `INSERT INTO order_items(order_id,source_product_id,product_name,category_label,sale_unit,unit_price_minor,quantity,line_total_minor) VALUES($1,$2,'Historical product','Historical category','Bolsa',100,$3,$4)`,
        [o.rows[0].id, p.rows[0].id, quantity, quantity * 100],
      );
  }
  const d = await getAdminAnalytics(period);
  expect(d.received).toBe(4);
  expect(d.daily.map((x) => x.count)).toEqual([1, 2, 1]);
  expect(d.eligible).toBe(2);
  expect(d.delivery).toEqual([{ type: 'PICKUP', count: 2 }]);
  expect(d.products).toEqual([
    {
      id: p.rows[0].id,
      name: 'Historical product',
      unit: 'Bolsa',
      quantity: 7,
    },
  ]);
  expect(d.categories).toEqual([
    { name: 'Historical category', unit: 'Bolsa', quantity: 7 },
  ]);
  expect(JSON.stringify(d)).not.toContain('55550000');
  expect(JSON.stringify(d)).not.toContain('Ficticio');
});
