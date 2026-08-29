import type { CreateOrderRequest } from '@/domain/order-contract';
import type { OrderStatus } from '@/domain/order-state';
import type { db } from '@/server/db/client';

export type OrdersDatabase = typeof db;
export type OrdersTransaction = Parameters<
  Parameters<OrdersDatabase['transaction']>[0]
>[0];

export type PaymentStatus =
  'UNPAID' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export type CreateOrderInput = Readonly<{
  request: CreateOrderRequest;
  idempotencyKey: string;
  idempotencySubject: string;
  requestId: string;
  receiptTokenSecret: string;
  now: Date;
  database?: OrdersDatabase;
  createOrderId?: () => string;
  createPublicId?: (now: Date) => string;
}>;

export type CreateOrderResult = Readonly<{
  kind: 'created' | 'replayed';
  order: Readonly<{
    publicId: string;
    receiptToken: string;
    orderStatus: OrderStatus;
    paymentStatus: PaymentStatus;
    subtotalMinor: number;
    shippingMinor: number | null;
    totalMinor: number | null;
  }>;
}>;
