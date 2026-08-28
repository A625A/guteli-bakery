# Güteli Backend 02: Persistent Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the approved ten-product catalog into PostgreSQL and serve it through typed server modules and a public API without changing the storefront design.

**Architecture:** Drizzle tables store categories, products, and image metadata. A repository returns minimal public DTOs in deterministic order. An idempotent seed copies only approved optimized runtime images from `public/images/products/` into the storage adapter; it never accesses `products/`.

**Tech Stack:** Next.js 16.3.3, PostgreSQL 17, Drizzle ORM/Kit, Zod, Vitest, Playwright

**Spec:** [Güteli Backend, Admin, Orders, and Operations Design](../specs/2026-08-27-guteli-backend-admin-orders-design.md)

## Global Constraints

- Complete [Plan 01](2026-08-27-guteli-backend-01-foundation.md) first.
- Preserve the exact ten approved products, prices, labels, order, optimized public photographs, and responsive presentation.
- Never access or stage `products/`; seed only from explicit files in `public/images/products/`.
- Public DTOs expose no storage filesystem path, database internals, inactive item, or soft-deleted item.
- Prices are integer centavos in storage and JSON; formatting happens at the UI boundary.

---

## Task 1: Create catalog schema and migration

**Files:**

- Create: `src/server/db/schema/catalog.ts`
- Modify: `src/server/db/schema/index.ts`
- Create: `drizzle/0001_catalog.sql` via Drizzle Kit
- Create: `drizzle/meta/*` via Drizzle Kit
- Test: `tests/integration/catalog-schema.test.ts`

**Interfaces:**

- Produces `categories`, `products`, and `productImages` Drizzle tables.
- Enforces unique category/product slugs, `price_minor >= 0`, `stock_quantity IS NULL OR stock_quantity >= 0`, and deterministic sort fields.

- [ ] Write an integration test that migrates a clean test database, inserts one category/product/image, rejects duplicate slugs, rejects a negative price, and accepts `stockQuantity=null`.
- [ ] Run `npm run test:integration -- tests/integration/catalog-schema.test.ts`; expect failure because the catalog tables do not exist.
- [ ] Define UUID primary keys, timestamps, soft deletion on products, and foreign-key behavior that prevents deleting a category or product with dependent business records.

```ts
export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    name: varchar('name', { length: 160 }).notNull(),
    priceMinor: integer('price_minor').notNull(),
    stockQuantity: integer('stock_quantity'),
    active: boolean('active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    check('products_price_nonnegative', sql`${table.priceMinor} >= 0`),
  ],
);
```

- [ ] Run `npm run db:generate -- --name catalog`; inspect generated SQL and rename only if the configured Drizzle version did not use `0001_catalog.sql`.
- [ ] Run `npm run db:migrate` against the local database and the focused integration test against the isolated test database; expect success.
- [ ] Commit: `git add src/server/db/schema drizzle tests/integration/catalog-schema.test.ts && git commit -m "feat: add persistent catalog schema"`.

## Task 2: Add local storage and the exact idempotent seed

**Files:**

- Create: `src/server/storage/types.ts`
- Create: `src/server/storage/local-storage.ts`
- Create: `src/server/storage/index.ts`
- Create: `src/server/products/seed-data.ts`
- Create: `scripts/seed.ts`
- Modify: `package.json`
- Test: `tests/integration/catalog-seed.test.ts`

**Interfaces:**

- Produces `ObjectStorage.putIfMissing`, `read`, and `publicUrl` methods.
- Produces `npm run db:seed`, safe to run repeatedly.
- Seed product IDs are stable UUIDs ending `0001` through `0010`; category IDs end `0101` through `0104` so reruns upsert the same records.

```ts
export type CatalogSeedProduct = {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  priceMinor: number;
  saleUnit: string | null;
  imageFile: string | null;
};
```

- [ ] Write an integration test that runs the seed twice and asserts exactly 4 categories, 10 products, 9 image rows, unchanged IDs, and prices `[6000,7500,7500,7500,6000,7500,7500,7500,5500,6000]` in approved order.
- [ ] Run the focused test; expect failure because `scripts/seed.ts` does not exist.
- [ ] Implement local storage rooted only at `UPLOADS_ROOT` (default `/app/uploads` in Docker and `uploads_data` locally), reject absolute/parent-traversal keys, write via a temporary file plus atomic rename, and return media URLs rather than filesystem paths.
- [ ] Encode the current catalog as immutable seed data. Map only these explicit optimized files: `pretzel-original.webp`, `pretzel-jalapeno.webp`, `pretzel-pepperoni.webp`, `pretzel-tomate-albahaca.webp`, `bagel-original.webp`, `bagel-jalapeno.webp`, `bagel-pepperoni.webp`, `bagel-tomate-albahaca.webp`, and `pan-hamburguesa.webp`; Nuditos has no image.
- [ ] Implement one database transaction using `onConflictDoUpdate`; copy each known public image to a generated, stable seed storage key only if missing.
- [ ] Add `"db:seed": "tsx scripts/seed.ts"`, run it twice, then run the focused integration test; expect all count and value assertions to pass.
- [ ] Commit: `git add package.json src/server/storage src/server/products/seed-data.ts scripts/seed.ts tests/integration/catalog-seed.test.ts && git commit -m "feat: seed approved persistent catalog"`.

## Task 3: Expose public catalog and media DTOs

**Files:**

- Create: `src/server/products/types.ts`
- Create: `src/server/products/repository.ts`
- Create: `src/server/products/list-public-products.ts`
- Create: `src/app/api/products/route.ts`
- Create: `src/app/api/products/[slug]/route.ts`
- Create: `src/app/api/media/[...key]/route.ts`
- Test: `tests/integration/public-products.test.ts`
- Test: `tests/browser/products-api.spec.ts`

**Interfaces:**

- Produces `GET /api/products` with `{ categories: PublicCategoryDto[] }`.
- Produces `GET /api/products/:slug` with one active product DTO or a safe `404`.
- Produces `GET /api/media/<opaque-key>` with an allowlisted image content type, immutable caching for hashed keys, and `404` for invalid/missing keys.
- `PublicProductDto` contains `id`, `slug`, `name`, `category`, `priceMinor`, `saleUnit`, `stockAvailable`, and nullable `imageUrl` only.

```ts
export type PublicProductDto = Readonly<{
  id: string;
  slug: string;
  name: string;
  category: { id: string; slug: string; name: string };
  priceMinor: number;
  saleUnit: string | null;
  stockAvailable: boolean;
  imageUrl: string | null;
}>;
```

- [ ] Add integration coverage proving inactive, deleted, and inactive-category products are excluded, active products sort by category/product sort order, and slug lookup cannot return hidden products.
- [ ] Add browser/API coverage proving the ten seeded products and nine media URLs return without exposing `storageKey`, `deletedAt`, or server paths.
- [ ] Run both focused suites; expect route-not-found failures.
- [ ] Implement the repository with explicit Drizzle column selection and map records to readonly DTOs; do not serialize raw database rows.
- [ ] Implement route handlers with request IDs, `Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=300` for catalog data, and safe JSON errors.
- [ ] Run the focused integration and browser/API suites; expect success.
- [ ] Commit: `git add src/server/products src/app/api/products src/app/api/media tests/integration/public-products.test.ts tests/browser/products-api.spec.ts && git commit -m "feat: serve persistent public catalog"`.

## Task 4: Migrate the storefront and cart to database product IDs

**Files:**

- Modify: `src/app/menu/page.tsx`
- Modify: `src/components/menu/MenuCatalog.tsx`
- Modify: `src/components/menu/ProductCard.tsx`
- Modify: `src/components/cart/CartProvider.tsx`
- Modify: `src/components/cart/CartView.tsx`
- Modify: `src/domain/cart.ts`
- Modify: `src/lib/money.ts`
- Delete after all imports are gone: `src/content/menu.ts`
- Test: `tests/unit/cart.test.ts`
- Test: `tests/unit/menu-and-money.test.ts`
- Modify: `tests/browser/menu.spec.ts`
- Modify: `tests/browser/order-journey.spec.ts`

**Interfaces:**

- Consumes `PublicCategoryDto[]` on the server and passes serializable data to client catalog/cart components.
- Stores only `{ productId: UUID, quantity }` under `guteli-cart-v2`.
- Treats legacy `guteli-cart-v1` slug carts as expired, removes that key, and presents an empty cart; no guessed slug-to-UUID conversion.

```ts
export type CartItem = Readonly<{ productId: string; quantity: number }>;

export function getCartLines(
  cart: readonly CartItem[],
  products: readonly PublicProductDto[],
): CartLine[];
```

- [ ] Update unit tests first to use UUID product IDs, integer `priceMinor`, and `guteli-cart-v2`; add a test proving malformed IDs and the legacy key cannot create lines.
- [ ] Run the focused unit tests; expect type and assertion failures against the slug-based cart.
- [ ] Replace `MenuProductId` with branded/validated UUID strings at input boundaries and make `getCartLines(cart, products)` consume current server-provided product DTOs rather than importing a hardcoded catalog.
- [ ] Make `MenuPage` load products server-side through the use case. Preserve all existing class names, headings, category order, card markup, and image treatment.
- [ ] Give `CartProvider` the current product list through the root/server boundary so cart prices remain display-only; the order server will recalculate later.
- [ ] Delete `src/content/menu.ts` only after `rg "content/menu|menuProducts|MenuProductId" src tests` returns no imports.
- [ ] Run unit, menu browser, and order-journey tests; expect the existing visual/behavior assertions and new persistent-ID assertions to pass.
- [ ] Commit: `git add src tests && git commit -m "feat: render storefront from persistent catalog"`.

## Task 5: Verify catalog persistence and design preservation

**Files:**

- Modify only when a failing proof identifies a catalog regression.

**Interfaces:**

- Produces the validated catalog baseline consumed by Plan 03.

- [ ] Run `npm run db:seed` twice and query counts through a checked-in script or integration test; expect 4/10/9 with no duplicates.
- [ ] Run `npm run format:check && npm run lint && npm run typecheck && npm test`; expect success.
- [ ] Run `npm run build && npm run test:e2e -- tests/browser/menu.spec.ts tests/browser/order-journey.spec.ts`; expect success.
- [ ] Restart `docker compose` without deleting volumes and call `/api/products`; expect the same ten database-backed products.
- [ ] Run `git status --short`; verify `products/` remains the same untracked directory and was not included in any commit.
