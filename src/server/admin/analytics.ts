import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { requireAdmin } from '@/server/auth/authorize';
import type { AdminPeriod } from '@/lib/admin-period';
export type AnalyticsDTO = {
  period: AdminPeriod;
  received: number;
  previous: number;
  eligible: number;
  daily: { day: string; count: number }[];
  statuses: { status: string; count: number }[];
  delivery: { type: string; count: number }[];
  products: { id: string; name: string; unit: string; quantity: number }[];
  categories: { name: string; unit: string; quantity: number }[];
};
export async function getAdminAnalytics(
  period: AdminPeriod,
  headers?: Headers,
): Promise<AnalyticsDTO> {
  await requireAdmin(headers);
  const range = sql`o.created_at >= ${period.start}::timestamptz AND o.created_at < ${period.end}::timestamptz`;
  const eligible = sql`${range} AND o.order_status <> 'CANCELLED' AND o.payment_status <> 'REFUNDED'`;
  const [daily, statuses, delivery, products, categories, previous] =
    await Promise.all([
      db.execute(
        sql`SELECT to_char(o.created_at AT TIME ZONE 'America/Guatemala','YYYY-MM-DD') AS day, count(*)::int AS count FROM orders o WHERE ${range} GROUP BY 1 ORDER BY 1`,
      ),
      db.execute(
        sql`SELECT o.order_status AS status, count(*)::int AS count FROM orders o WHERE ${range} GROUP BY 1`,
      ),
      db.execute(
        sql`SELECT o.fulfillment AS type,count(*)::int AS count FROM orders o WHERE ${eligible} GROUP BY 1`,
      ),
      db.execute(
        sql`SELECT i.source_product_id AS id,i.product_name AS name,coalesce(i.sale_unit,'Presentación sin especificar') AS unit,sum(i.quantity)::int AS quantity FROM order_items i JOIN orders o ON o.id=i.order_id WHERE ${eligible} GROUP BY i.source_product_id,i.product_name,i.sale_unit ORDER BY quantity DESC,i.product_name,i.source_product_id,i.sale_unit LIMIT 8`,
      ),
      db.execute(
        sql`SELECT i.category_label AS name,coalesce(i.sale_unit,'Presentación sin especificar') AS unit,sum(i.quantity)::int AS quantity FROM order_items i JOIN orders o ON o.id=i.order_id WHERE ${eligible} GROUP BY i.category_label,i.sale_unit ORDER BY quantity DESC,i.category_label,i.sale_unit LIMIT 12`,
      ),
      db.execute(
        sql`SELECT count(*)::int AS count FROM orders WHERE created_at >= ${period.previousStart}::timestamptz AND created_at < ${period.previousEnd}::timestamptz`,
      ),
    ]);
  const counts = new Map(
    (daily.rows as { day: string; count: number }[]).map((x) => [
      x.day,
      x.count,
    ]),
  );
  const deliveryRows = delivery.rows as AnalyticsDTO['delivery'];
  return {
    period,
    received: [...counts.values()].reduce((a, b) => a + b, 0),
    previous: Number(previous.rows[0]?.count ?? 0),
    eligible: deliveryRows.reduce((a, b) => a + b.count, 0),
    daily: period.days.map((day) => ({ day, count: counts.get(day) ?? 0 })),
    statuses: statuses.rows as AnalyticsDTO['statuses'],
    delivery: deliveryRows,
    products: products.rows as AnalyticsDTO['products'],
    categories: categories.rows as AnalyticsDTO['categories'],
  };
}
