import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 160 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    active: boolean('active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    check('categories_sort_order_nonnegative', sql`${table.sortOrder} >= 0`),
  ],
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, {
        onDelete: 'no action',
        onUpdate: 'no action',
      }),
    name: varchar('name', { length: 160 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    description: text('description').notNull().default(''),
    saleUnit: varchar('sale_unit', { length: 80 }),
    sku: varchar('sku', { length: 80 }),
    priceMinor: integer('price_minor').notNull(),
    stockQuantity: integer('stock_quantity'),
    active: boolean('active').notNull().default(true),
    featured: boolean('featured').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    check('products_price_nonnegative', sql`${table.priceMinor} >= 0`),
    check(
      'products_stock_nonnegative',
      sql`${table.stockQuantity} IS NULL OR ${table.stockQuantity} >= 0`,
    ),
    check('products_sort_order_nonnegative', sql`${table.sortOrder} >= 0`),
  ],
);

export const productImages = pgTable(
  'product_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, {
        onDelete: 'no action',
        onUpdate: 'no action',
      }),
    storageKey: varchar('storage_key', { length: 512 }).notNull().unique(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    check('product_images_width_positive', sql`${table.width} > 0`),
    check('product_images_height_positive', sql`${table.height} > 0`),
    check(
      'product_images_sort_order_nonnegative',
      sql`${table.sortOrder} >= 0`,
    ),
  ],
);
