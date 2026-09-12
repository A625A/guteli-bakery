import {
  boolean,
  check,
  index,
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
    version: integer('version').notNull().default(1),
    ...timestamps,
  },
  (table) => [
    check('categories_sort_order_nonnegative', sql`${table.sortOrder} >= 0`),
    check('categories_version_positive', sql`${table.version} > 0`),
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
    version: integer('version').notNull().default(1),
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
    check('products_version_positive', sql`${table.version} > 0`),
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
    storageKey: varchar('storage_key', { length: 512 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
    removedAt: timestamp('removed_at', { withTimezone: true }),
    cleanupPending: boolean('cleanup_pending').notNull().default(false),
    cleanupAttempts: integer('cleanup_attempts').notNull().default(0),
    cleanupCompletedAt: timestamp('cleanup_completed_at', {
      withTimezone: true,
    }),
    lastCleanupErrorCode: varchar('last_cleanup_error_code', { length: 100 }),
  },
  (table) => [
    check('product_images_width_positive', sql`${table.width} > 0`),
    check('product_images_height_positive', sql`${table.height} > 0`),
    check(
      'product_images_sort_order_nonnegative',
      sql`${table.sortOrder} >= 0`,
    ),
    check(
      'product_images_cleanup_attempts_nonnegative',
      sql`${table.cleanupAttempts} >= 0`,
    ),
    index('product_images_product_active_idx').on(
      table.productId,
      table.removedAt,
      table.sortOrder,
    ),
    index('product_images_cleanup_pending_idx').on(
      table.cleanupPending,
      table.updatedAt,
    ),
    index('product_images_storage_key_idx').on(table.storageKey),
  ],
);

export const imageCleanupJobs = pgTable(
  'image_cleanup_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storageKey: varchar('storage_key', { length: 512 }).notNull().unique(),
    cleanupAttempts: integer('cleanup_attempts').notNull().default(0),
    lastCleanupErrorCode: varchar('last_cleanup_error_code', { length: 100 }),
    ...timestamps,
  },
  (table) => [
    check(
      'image_cleanup_jobs_attempts_nonnegative',
      sql`${table.cleanupAttempts} >= 0`,
    ),
    index('image_cleanup_jobs_updated_idx').on(table.updatedAt),
  ],
);
