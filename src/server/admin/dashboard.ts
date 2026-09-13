import 'server-only';

import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { requireAdmin } from '@/server/auth/authorize';
import { db } from '@/server/db/client';
import {
  categories,
  orders,
  orderStatusEnum,
  outboxEvents,
  products,
} from '@/server/db/schema';

type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

export const LOW_STOCK_THRESHOLD = 5;
const GUATEMALA_TIME_ZONE = 'America/Guatemala';
const ACTIONABLE_STATUSES: readonly OrderStatus[] = [
  'RECEIVED',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
];

export type AdminDashboardDTO = Readonly<{
  orderCounts: Readonly<Record<OrderStatus, number>>;
  ordersReceivedTodayCount: number;
  actionableOrderCount: number;
  activeProductCount: number;
  unavailableProductCount: number;
  lowStockProductCount: number;
  pendingNotificationCount: number;
  failedNotificationCount: number;
  recentOrders: readonly Readonly<{
    publicId: string;
    orderStatus: OrderStatus;
    fulfillment: 'PICKUP' | 'DELIVERY';
    requestedDate: string;
    createdAt: Date;
  }>[];
}>;

export async function getAdminDashboard(
  requestHeaders?: Headers,
  now = new Date(),
): Promise<AdminDashboardDTO> {
  await requireAdmin(requestHeaders);

  const [counts, todayRows, notificationRows, productRows, recentOrders] =
    await Promise.all([
      db
        .select({
          orderStatus: orders.orderStatus,
          count: sql<number>`count(*)::integer`,
        })
        .from(orders)
        .groupBy(orders.orderStatus),
      db
        .select({
          count: sql<number>`count(*) filter (
          where ${orders.createdAt} >= (
            date_trunc('day', ${now}::timestamptz at time zone ${GUATEMALA_TIME_ZONE})
            at time zone ${GUATEMALA_TIME_ZONE}
          )
          and ${orders.createdAt} < (
            date_trunc('day', ${now}::timestamptz at time zone ${GUATEMALA_TIME_ZONE})
            + interval '1 day'
          ) at time zone ${GUATEMALA_TIME_ZONE}
        )::integer`,
        })
        .from(orders),
      db
        .select({
          pendingCount: sql<number>`count(*) filter (
            where ${outboxEvents.state} = 'PENDING'
          )::integer`,
          failedCount: sql<number>`count(*) filter (
            where ${outboxEvents.state} = 'FAILED'
          )::integer`,
        })
        .from(outboxEvents)
        .where(eq(outboxEvents.eventType, 'OWNER_ORDER_CREATED')),
      db
        .select({
          activeCount: sql<number>`count(*)::integer`,
          unavailableCount: sql<number>`count(*) filter (
            where ${products.stockQuantity} = 0
          )::integer`,
          lowStockCount: sql<number>`count(*) filter (
            where ${products.stockQuantity} between 1 and ${LOW_STOCK_THRESHOLD}
          )::integer`,
        })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(
          and(
            eq(products.active, true),
            isNull(products.deletedAt),
            eq(categories.active, true),
          ),
        ),
      db
        .select({
          publicId: orders.publicId,
          orderStatus: orders.orderStatus,
          fulfillment: orders.fulfillment,
          requestedDate: orders.requestedDate,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .orderBy(desc(orders.createdAt), desc(orders.id))
        .limit(10),
    ]);

  const orderCounts = Object.fromEntries(
    orderStatusEnum.enumValues.map((status) => [status, 0]),
  ) as Record<OrderStatus, number>;
  for (const row of counts) orderCounts[row.orderStatus] = row.count;

  return {
    orderCounts,
    ordersReceivedTodayCount: todayRows[0]?.count ?? 0,
    actionableOrderCount: ACTIONABLE_STATUSES.reduce(
      (total, status) => total + orderCounts[status],
      0,
    ),
    activeProductCount: productRows[0]?.activeCount ?? 0,
    unavailableProductCount: productRows[0]?.unavailableCount ?? 0,
    lowStockProductCount: productRows[0]?.lowStockCount ?? 0,
    pendingNotificationCount: notificationRows[0]?.pendingCount ?? 0,
    failedNotificationCount: notificationRows[0]?.failedCount ?? 0,
    recentOrders,
  };
}
