import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { products } from './catalog';

export const promotions = pgTable(
  'promotions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 120 }).notNull(),
    scope: varchar('scope', { length: 16 })
      .$type<'CATALOG' | 'SELECTED'>()
      .notNull(),
    discountBps: integer('discount_bps').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    enabled: boolean('enabled').notNull().default(true),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'promotions_scope_valid',
      sql`${table.scope} IN ('CATALOG', 'SELECTED')`,
    ),
    check(
      'promotions_discount_valid',
      sql`${table.discountBps} BETWEEN 1 AND 10000`,
    ),
    check('promotions_window_valid', sql`${table.endsAt} > ${table.startsAt}`),
    check('promotions_version_positive', sql`${table.version} > 0`),
    index('promotions_active_window_idx').on(
      table.enabled,
      table.startsAt,
      table.endsAt,
    ),
  ],
);

export const promotionProducts = pgTable(
  'promotion_products',
  {
    promotionId: uuid('promotion_id')
      .notNull()
      .references(() => promotions.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'no action' }),
  },
  (table) => [primaryKey({ columns: [table.promotionId, table.productId] })],
);
