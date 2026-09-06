import 'server-only';

import { and, count, desc, eq } from 'drizzle-orm';

import { requireAdmin } from '@/server/auth/authorize';
import { db } from '@/server/db/client';
import { orders } from '@/server/db/schema';
import { orderStatuses, type OrderStatus } from '@/domain/order-state';

export type AdminOrderListDto = Readonly<{
  publicId: string;
  createdAt: string;
  requestedDate: string;
  customerName: string;
  fulfillment: 'PICKUP' | 'DELIVERY';
  subtotalMinor: number;
  shippingMinor: number | null;
  totalMinor: number | null;
  quoteState: 'NOT_APPLICABLE' | 'PENDING' | 'QUOTED';
  orderStatus: OrderStatus;
  paymentStatus: 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  version: number;
}>;

export type AdminOrderFilters = Readonly<{
  page?: unknown;
  pageSize?: unknown;
  status?: unknown;
  fulfillment?: unknown;
  date?: unknown;
}>;

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function validIsoDate(value: string) {
  if (!isoDatePattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function positiveInteger(value: unknown, fallback: number) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') {
    if (!/^[1-9]\d*$/.test(value)) throw new RangeError('Invalid pagination.');
    value = Number(value);
  }
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new RangeError('Invalid pagination.');
  }
  return value;
}

export function parseAdminOrderFilters(input: AdminOrderFilters = {}) {
  const page = positiveInteger(input.page, 1);
  const pageSize = positiveInteger(input.pageSize, 25);
  const offset = (page - 1) * pageSize;
  if (pageSize > 100 || !Number.isSafeInteger(offset)) {
    throw new RangeError('Invalid pagination.');
  }
  const status = input.status === '' ? undefined : input.status;
  if (
    status !== undefined &&
    (typeof status !== 'string' ||
      !orderStatuses.includes(status as OrderStatus))
  ) {
    throw new RangeError('Invalid status filter.');
  }
  const fulfillment = input.fulfillment === '' ? undefined : input.fulfillment;
  if (
    fulfillment !== undefined &&
    fulfillment !== 'PICKUP' &&
    fulfillment !== 'DELIVERY'
  ) {
    throw new RangeError('Invalid fulfillment filter.');
  }
  const date = input.date === '' ? undefined : input.date;
  if (date !== undefined && (typeof date !== 'string' || !validIsoDate(date))) {
    throw new RangeError('Invalid date filter.');
  }
  return {
    page,
    pageSize,
    offset,
    status: status as OrderStatus | undefined,
    fulfillment: fulfillment as 'PICKUP' | 'DELIVERY' | undefined,
    date: date as string | undefined,
  } as const;
}

function quoteState(order: {
  fulfillment: 'PICKUP' | 'DELIVERY';
  shippingMinor: number | null;
}) {
  if (order.fulfillment === 'PICKUP') return 'NOT_APPLICABLE' as const;
  return order.shippingMinor === null
    ? ('PENDING' as const)
    : ('QUOTED' as const);
}

export async function adminListOrders(
  requestHeaders: Headers,
  filters: AdminOrderFilters = {},
) {
  await requireAdmin(requestHeaders);
  const parsed = parseAdminOrderFilters(filters);
  const conditions = [
    parsed.status ? eq(orders.orderStatus, parsed.status) : undefined,
    parsed.fulfillment ? eq(orders.fulfillment, parsed.fulfillment) : undefined,
    parsed.date ? eq(orders.requestedDate, parsed.date) : undefined,
  ].filter(
    (condition): condition is NonNullable<typeof condition> => !!condition,
  );
  const where = conditions.length === 0 ? undefined : and(...conditions);
  const selection = {
    publicId: orders.publicId,
    createdAt: orders.createdAt,
    requestedDate: orders.requestedDate,
    customerName: orders.customerName,
    fulfillment: orders.fulfillment,
    subtotalMinor: orders.subtotalMinor,
    shippingMinor: orders.shippingMinor,
    totalMinor: orders.totalMinor,
    orderStatus: orders.orderStatus,
    paymentStatus: orders.paymentStatus,
    version: orders.version,
  };
  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select(selection)
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt), desc(orders.publicId))
      .limit(parsed.pageSize)
      .offset(parsed.offset),
    db.select({ value: count() }).from(orders).where(where),
  ]);
  return {
    orders: rows.map((order): AdminOrderListDto => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
      quoteState: quoteState(order),
    })),
    page: parsed.page,
    pageSize: parsed.pageSize,
    total,
  } as const;
}
