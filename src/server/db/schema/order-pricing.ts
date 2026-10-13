import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { PricingSnapshot } from '@/domain/checkout-pricing';
import { orders } from './orders';

// Append-only evidence. Unpaid projections may change; revision contents never do.
export const orderPricingRevisions = pgTable(
  'order_pricing_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id),
    fingerprint: varchar('fingerprint', { length: 64 }).notNull(),
    snapshot: jsonb('snapshot').$type<PricingSnapshot>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('order_pricing_revisions_order_idx').on(table.orderId)],
);

export const orderPricingState = pgTable('order_pricing_state', {
  orderId: uuid('order_id')
    .primaryKey()
    .references(() => orders.id),
  currentRevisionId: uuid('current_revision_id')
    .notNull()
    .references(() => orderPricingRevisions.id),
  acceptedRevisionId: uuid('accepted_revision_id').references(
    () => orderPricingRevisions.id,
  ),
  quoteVersion: integer('quote_version').notNull().default(0),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
});
