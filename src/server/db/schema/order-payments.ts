import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { orders, paymentMethodEnum, paymentStatusEnum } from './orders';
import { user } from './auth';
import { orderPricingRevisions } from './order-pricing';

/** Append-only owner attestation of money actually received/returned, never a gateway charge. */
export const orderPaymentEvents = pgTable(
  'order_payment_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id),
    kind: varchar('kind', { length: 16 })
      .$type<'VERIFIED' | 'REFUNDED'>()
      .notNull(),
    amountMinor: integer('amount_minor').notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }).notNull(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => user.id),
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => orderPricingRevisions.id),
    evidence: varchar('evidence', { length: 32 }).notNull(),
    note: varchar('note', { length: 160 }),
    previousStatus: paymentStatusEnum('previous_status').notNull(),
    newStatus: paymentStatusEnum('new_status').notNull(),
    idempotencyKey: uuid('idempotency_key').notNull(),
    requestHash: varchar('request_hash', { length: 64 }).notNull(),
    resultVersion: integer('result_version').notNull(),
  },
  (table) => [
    uniqueIndex('order_payment_event_kind_idx').on(table.orderId, table.kind),
    uniqueIndex('order_payment_event_key_idx').on(
      table.orderId,
      table.idempotencyKey,
    ),
    check(
      'order_payment_amount_valid',
      sql`${table.amountMinor} >= 0 AND ${table.currency} = 'GTQ' AND ${table.resultVersion} > 1`,
    ),
    check(
      'order_payment_transition_valid',
      sql`(${table.kind} = 'VERIFIED' AND ${table.previousStatus} IN ('UNPAID', 'FAILED') AND ${table.newStatus} = 'PAID' AND ((${table.paymentMethod} = 'BANK_TRANSFER' AND ${table.evidence} = 'BANK_FUNDS_RECEIVED') OR (${table.paymentMethod} IN ('CASH_PICKUP', 'CASH_DELIVERY') AND ${table.evidence} = 'CASH_COLLECTED'))) OR (${table.kind} = 'REFUNDED' AND ${table.previousStatus} = 'PAID' AND ${table.newStatus} = 'REFUNDED' AND ${table.evidence} = 'REFUND_RETURNED')`,
    ),
  ],
);
