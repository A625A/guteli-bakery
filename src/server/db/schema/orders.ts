import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { products } from './catalog';

export const fulfillmentEnum = pgEnum('fulfillment', ['PICKUP', 'DELIVERY']);

export const orderStatusEnum = pgEnum('order_status', [
  'RECEIVED',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'CANCELLED',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'UNPAID',
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
]);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: varchar('public_id', { length: 32 }).notNull(),
    customerName: varchar('customer_name', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    fulfillment: fulfillmentEnum('fulfillment').notNull(),
    requestedDate: date('requested_date').notNull(),
    deliveryLocation: varchar('delivery_location', { length: 300 }),
    notes: varchar('notes', { length: 500 }),
    subtotalMinor: integer('subtotal_minor').notNull(),
    shippingMinor: integer('shipping_minor'),
    totalMinor: integer('total_minor'),
    orderStatus: orderStatusEnum('order_status').notNull().default('RECEIVED'),
    paymentStatus: paymentStatusEnum('payment_status')
      .notNull()
      .default('UNPAID'),
    receiptTokenHash: varchar('receipt_token_hash', { length: 64 }).notNull(),
    ...timestamps,
    anonymizedAt: timestamp('anonymized_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('orders_public_id_idx').on(table.publicId),
    uniqueIndex('orders_receipt_token_hash_idx').on(table.receiptTokenHash),
    index('orders_created_at_idx').on(table.createdAt),
    index('orders_order_status_idx').on(table.orderStatus),
    check('orders_subtotal_nonnegative', sql`${table.subtotalMinor} >= 0`),
    check(
      'orders_shipping_nonnegative',
      sql`${table.shippingMinor} IS NULL OR ${table.shippingMinor} >= 0`,
    ),
    check(
      'orders_total_nonnegative',
      sql`${table.totalMinor} IS NULL OR ${table.totalMinor} >= 0`,
    ),
    check(
      'orders_fulfillment_totals',
      sql`
        (
          ${table.fulfillment} = 'PICKUP'
          AND ${table.deliveryLocation} IS NULL
          AND ${table.shippingMinor} = 0
          AND ${table.totalMinor} = ${table.subtotalMinor}
        )
        OR
        (
          ${table.fulfillment} = 'DELIVERY'
          AND ${table.deliveryLocation} IS NOT NULL
          AND btrim(${table.deliveryLocation}) <> ''
          AND (
            (${table.shippingMinor} IS NULL AND ${table.totalMinor} IS NULL)
            OR
            (
              ${table.shippingMinor} IS NOT NULL
              AND ${table.totalMinor} IS NOT NULL
              AND ${table.totalMinor} = ${table.subtotalMinor} + ${table.shippingMinor}
            )
          )
        )
      `,
    ),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, {
        onDelete: 'no action',
        onUpdate: 'no action',
      }),
    sourceProductId: uuid('source_product_id')
      .notNull()
      .references(() => products.id, {
        onDelete: 'no action',
        onUpdate: 'no action',
      }),
    productName: varchar('product_name', { length: 160 }).notNull(),
    categoryLabel: varchar('category_label', { length: 160 }).notNull(),
    saleUnit: varchar('sale_unit', { length: 80 }),
    unitPriceMinor: integer('unit_price_minor').notNull(),
    quantity: integer('quantity').notNull(),
    lineTotalMinor: integer('line_total_minor').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('order_items_order_id_idx').on(table.orderId),
    check('order_items_quantity_positive', sql`${table.quantity} > 0`),
    check(
      'order_items_unit_price_nonnegative',
      sql`${table.unitPriceMinor} >= 0`,
    ),
    check(
      'order_items_line_total_nonnegative',
      sql`${table.lineTotalMinor} >= 0`,
    ),
    check(
      'order_items_snapshot_total_exact',
      sql`${table.lineTotalMinor} = ${table.unitPriceMinor} * ${table.quantity}`,
    ),
  ],
);
