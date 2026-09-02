import 'server-only';

import { and, desc, eq, sql } from 'drizzle-orm';

import { requireAdmin } from '@/server/auth/authorize';
import { db } from '@/server/db/client';
import { orders, orderStatusEnum, outboxEvents } from '@/server/db/schema';

type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

export type AdminDashboardDTO = Readonly<{
  orderCounts: Readonly<Record<OrderStatus, number>>;
  pendingNotificationCount: number;
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
): Promise<AdminDashboardDTO> {
  await requireAdmin(requestHeaders);

  const [counts, pendingRows, recentOrders] = await Promise.all([
    db
      .select({
        orderStatus: orders.orderStatus,
        count: sql<number>`count(*)::integer`,
      })
      .from(orders)
      .groupBy(orders.orderStatus),
    db
      .select({ count: sql<number>`count(*)::integer` })
      .from(outboxEvents)
      .where(
        and(
          eq(outboxEvents.state, 'PENDING'),
          eq(outboxEvents.eventType, 'OWNER_ORDER_CREATED'),
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
    pendingNotificationCount: pendingRows[0]?.count ?? 0,
    recentOrders,
  };
}
