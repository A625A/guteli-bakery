# Güteli Backend 03: Orders and Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist server-priced orders atomically, expose an idempotent public order API, and replace the WhatsApp handoff checkout with a durable success/receipt flow.

**Architecture:** A thin route validates HTTP input and calls an order service. The service locks products, computes snapshot totals in centavos, enforces optional stock, inserts the order/items/idempotency/outbox records in one PostgreSQL transaction, and returns a minimal receipt. Order creation never depends on WhatsApp or payment availability.

**Tech Stack:** Next.js 16.3.3 Route Handlers, PostgreSQL 17, Drizzle ORM, Zod, Web Crypto/Node crypto, Vitest, Playwright

**Spec:** [Güteli Backend, Admin, Orders, and Operations Design](../specs/2026-08-27-guteli-backend-admin-orders-design.md)

## Global Constraints

- Complete [Plan 02](2026-08-27-guteli-backend-02-catalog.md) first.
- The browser sends product IDs and quantities only; server prices and snapshots are authoritative.
- Customer phone and delivery location are persisted with the order and later included in the owner's notification.
- Pickup has `shippingMinor=0` and `totalMinor=subtotalMinor`; delivery starts with both fields null until quoted.
- All new orders start `orderStatus=RECEIVED` and `paymentStatus=UNPAID`.
- A notification failure cannot roll back or delete an accepted order.

---

## Task 1: Add order, idempotency, rate-limit, outbox, and audit schema

**Files:**

- Create: `src/server/db/schema/orders.ts`
- Create: `src/server/db/schema/operations.ts`
- Modify: `src/server/db/schema/index.ts`
- Create: next generated catalog-following migration under `drizzle/`
- Test: `tests/integration/order-schema.test.ts`

**Interfaces:**

- Produces `orders`, `orderItems`, `idempotencyRecords`, `rateLimitBuckets`, `outboxEvents`, and `auditLogs`.
- Enforces enumerated states, positive quantities, nonnegative money, receipt-token hash uniqueness, and one idempotency key per operation/subject.

```ts
export const orderStatusEnum = pgEnum('order_status', [
  'RECEIVED',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'CANCELLED',
]);
```

- [ ] Write a clean-database integration test that inserts a complete pickup order, rejects a zero quantity, rejects a delivery order with a non-null total but null shipping, and proves deleting the source product cannot delete the order snapshot.
- [ ] Run the focused test; expect missing-schema failure.
- [ ] Define database enums for fulfillment, order status, payment status, and outbox state. Use `date` for requested local date and timezone-aware timestamps for events.
- [ ] Add check constraints matching the approved pickup/delivery total invariant and indexes for public ID, receipt-token hash, created time, order status, outbox due work, and rate-limit windows.
- [ ] Run `npm run db:generate -- --name orders` and inspect the SQL for every constraint/index before applying it.
- [ ] Run the migration and focused integration test; expect success.
- [ ] Commit: `git add src/server/db/schema drizzle tests/integration/order-schema.test.ts && git commit -m "feat: add durable order schema"`.

## Task 2: Implement order input, identifiers, totals, and state policies

**Files:**

- Create: `src/domain/order-contract.ts`
- Create: `src/domain/order-state.ts`
- Create: `src/server/orders/identifiers.ts`
- Create: `src/server/orders/request-hash.ts`
- Create: `src/server/orders/errors.ts`
- Test: `tests/unit/order-contract.test.ts`
- Test: `tests/unit/order-identifiers.test.ts`
- Test: `tests/unit/order-state.test.ts`

**Interfaces:**

- Produces `createOrderRequestSchema`, canonical request hashing, public order IDs, receipt tokens/hashes, and allowed state transitions.
- Public request shape is exactly `{customerName, phone, fulfillment, requestedDate, deliveryLocation?, notes?, items:[{productId,quantity}]}`.
- Error codes are `VALIDATION_ERROR`, `IDEMPOTENCY_CONFLICT`, `RATE_LIMITED`, `PRODUCT_UNAVAILABLE`, `PRODUCT_OUT_OF_STOCK`, and `INTERNAL_ERROR`.

- [ ] Add tests for field limits, 8–15 phone digits, ISO dates, the configured Guatemala-local minimum date, delivery-location requirement, 1–99 quantities, duplicate product rejection, unknown keys, stable canonical hashes, token hash non-reversibility, and every allowed/disallowed state edge.
- [ ] Run the three focused suites; expect module-not-found failures.
- [ ] Implement strict Zod schemas and pure transition sets. Normalize whitespace for names/phones/notes before hashing, but do not rewrite customer meaning.

```ts
export const createOrderRequestSchema = z
  .object({
    customerName: z.string().trim().min(1).max(100),
    phone: phoneSchema,
    fulfillment: z.enum(['pickup', 'delivery']),
    requestedDate: isoLocalDateSchema,
    deliveryLocation: z.string().trim().max(300).optional(),
    notes: z.string().trim().max(500).optional(),
    items: z.array(orderItemSchema).min(1).max(30),
  })
  .strict()
  .superRefine(requireDeliveryLocation);
```

- [ ] Generate public IDs from cryptographically random bytes using the restricted alphabet in the spec; generate at least 128-bit receipt tokens and persist only SHA-256 hashes.
- [ ] Run the focused suites; expect all assertions to pass.
- [ ] Commit: `git add src/domain/order-contract.ts src/domain/order-state.ts src/server/orders tests/unit/order-contract.test.ts tests/unit/order-identifiers.test.ts tests/unit/order-state.test.ts && git commit -m "feat: define order contracts and policies"`.

## Task 3: Implement the atomic create-order service

**Files:**

- Create: `src/server/orders/create-order.ts`
- Create: `src/server/orders/repository.ts`
- Create: `src/server/orders/types.ts`
- Test: `tests/integration/create-order.test.ts`
- Test: `tests/integration/create-order-concurrency.test.ts`

**Interfaces:**

- Consumes parsed request, `Idempotency-Key`, HMAC-derived rate subject, request ID, and current clock.
- Produces `{ kind: 'created' | 'replayed', order: { publicId, receiptToken, orderStatus, paymentStatus, subtotalMinor, shippingMinor, totalMinor } }`.
- Writes order, item snapshots, idempotency record, `OWNER_ORDER_CREATED` outbox event, and audit record in one transaction.

```ts
export async function createOrder(input: CreateOrderInput) {
  return db.transaction(async (tx) => {
    const products = await lockRequestedProducts(tx, input.request.items);
    const priced = priceAndValidateItems(input.request, products);
    return persistOrderAggregate(tx, input, priced);
  });
}
```

- [ ] Write integration tests proving server price override, exact snapshots, pickup/delivery totals, inactive/missing products, duplicate retry replay, changed-payload conflict, public-ID retry on collision, stock-null bypass, atomic decrement, and rollback on insufficient stock.
- [ ] Add a two-connection concurrency test with stock `1`; submit two orders simultaneously and expect exactly one accepted order, one `PRODUCT_OUT_OF_STOCK`, and final stock `0`.
- [ ] Run both suites; expect failure because `createOrder` does not exist.
- [ ] Implement `createOrder` with a single transaction. Lock selected product rows in sorted UUID order, verify all requested IDs were returned, calculate checked integer totals, decrement tracked stock conditionally, and insert immutable item snapshots.
- [ ] Claim idempotency inside the same transaction. On a unique-key race, read the committed record and replay only when canonical hashes match; never create a second order.
- [ ] Insert an outbox reference containing only `orderId` and `requestId`; do not duplicate phone/location in outbox JSON. Insert a safe audit event without customer PII.
- [ ] Run both integration suites repeatedly with `--repeat=5` or the installed Vitest equivalent; expect deterministic success and no negative stock.
- [ ] Commit: `git add src/server/orders tests/integration/create-order.test.ts tests/integration/create-order-concurrency.test.ts && git commit -m "feat: create orders atomically"`.

## Task 4: Expose the public order and receipt APIs with abuse controls

**Files:**

- Create: `src/server/security/client-subject.ts`
- Create: `src/server/security/rate-limit.ts`
- Create: `src/server/http/error-response.ts`
- Create: `src/app/api/orders/route.ts`
- Create: `src/server/orders/get-receipt.ts`
- Create: `src/app/api/order-status/[receiptToken]/route.ts`
- Test: `tests/integration/order-api.test.ts`
- Test: `tests/integration/receipt-api.test.ts`

**Interfaces:**

- Produces `POST /api/orders`, returning `201` when created and `200` for an exact idempotent replay.
- Produces `GET /api/order-status/:receiptToken`, returning only customer-safe receipt data.
- All failures use `{ error: { code, message, requestId, fieldErrors? } }`; `429` also returns `Retry-After`.

```ts
export function errorResponse(error: PublicError, status: number) {
  return Response.json(
    {
      error: {
        code: error.code,
        message: error.message,
        requestId: error.requestId,
      },
    },
    { status },
  );
}
```

- [ ] Add route-level tests for missing/malformed idempotency key, malformed JSON, schema errors, oversized body, rate limit, exact replay, conflict, unavailable product, safe 500, invalid receipt token, and valid receipt token.
- [ ] Run the focused suites; expect route-not-found failures.
- [ ] Derive a rate subject as `HMAC(RATE_LIMIT_SECRET, normalizedClientAddress)` and store only the digest. Trust forwarded-address headers only when `TRUSTED_PROXY_HOPS` is configured; otherwise use the direct platform address source.
- [ ] Implement transactional fixed-window PostgreSQL limiters for 10 attempts per 15 minutes by HMAC IP subject and 5 successful orders per 30 minutes by normalized-phone HMAC subject. Bound JSON bodies before parsing and return the same safe error envelope from all paths.
- [ ] Implement the order route as parsing/mapping only. Never accept price, subtotal, shipping, total, status, payment state, public ID, or notification destination from the body.
- [ ] Implement receipt lookup by hashing the supplied token and selecting only public ID, statuses, requested date, fulfillment, totals, and item snapshots; omit full phone/location after creation confirmation.
- [ ] Run both integration suites; expect success.
- [ ] Commit: `git add src/server/security src/server/http src/app/api/orders src/app/api/order-status src/server/orders/get-receipt.ts tests/integration/order-api.test.ts tests/integration/receipt-api.test.ts && git commit -m "feat: expose protected public order api"`.

## Task 5: Replace handoff checkout with durable submission and receipt

**Files:**

- Modify: `src/components/order/OrderRequest.tsx`
- Modify: `src/domain/order.ts`
- Create: `src/lib/order-api.ts`
- Create: `src/app/order/confirmation/[token]/page.tsx`
- Create: `src/components/order/OrderConfirmation.tsx`
- Modify: `src/components/cart/CartProvider.tsx`
- Modify: `src/content/business.ts`
- Modify: `tests/browser/order-journey.spec.ts`
- Create: `tests/unit/order-api.test.ts`

**Interfaces:**

- Checkout states are `EDITING`, `SUBMITTING`, `SUCCESS`, and recoverable `ERROR`.
- One form attempt keeps one UUID idempotency key across safe retries; editing the payload after an error rotates the key.
- Cart clears only after an accepted response. The success URL uses the receipt token, not the public ID.

```ts
type CheckoutState =
  | { kind: 'EDITING' }
  | { kind: 'SUBMITTING'; idempotencyKey: string }
  | { kind: 'SUCCESS'; publicId: string; receiptToken: string }
  | { kind: 'ERROR'; idempotencyKey: string; message: string };
```

- [ ] Update browser tests first to assert disabled double-submit, one network request, retained cart on a simulated 500, same key on retry, rotated key after editing, success public ID, and cleared cart only after success.
- [ ] Add a unit test for the fetch adapter mapping typed server errors without reflecting raw response text.
- [ ] Run the focused tests; expect failures against the WhatsApp summary flow.
- [ ] Replace `reviewRequest`/clipboard/WhatsApp behavior with a JSON request to `/api/orders`. Keep current field markup, accessibility error summary, delivery location, phone, date controls, and visual classes.
- [ ] Add a concise privacy notice explaining that contact and delivery data are used to fulfill the order and notify the bakery owner.
- [ ] Navigate to `/order/confirmation/<receipt-token>/` only after success; render the public ID, statuses, item snapshots, subtotal, and “delivery to be quoted” state using the receipt API/server use case.
- [ ] Remove obsolete checkout imports of `buildOrderSummary` and `buildWhatsAppUrl`; retain click-to-chat only on general contact surfaces if still approved there.
- [ ] Run unit and browser checkout tests; expect success.
- [ ] Commit: `git add src tests/browser/order-journey.spec.ts tests/unit/order-api.test.ts && git commit -m "feat: submit and confirm durable orders"`.

## Task 6: Verify failure independence and restart persistence

**Files:**

- Create: `tests/browser/order-persistence.spec.ts`
- Modify only when proof exposes a defect: order implementation files from this plan

**Interfaces:**

- Produces the validated order baseline consumed by Plan 04 and Plan 05.

- [ ] Create an order with notification delivery unconfigured; expect accepted order, `UNPAID`, one pending outbox event, and no false sent status.
- [ ] Restart the app container without deleting volumes; expect receipt lookup and database order count to remain intact.
- [ ] Run `npm run format:check && npm run lint && npm run typecheck && npm test`; expect success.
- [ ] Run all integration tests against a freshly migrated test database; expect success.
- [ ] Run `npm run build && npm run test:e2e`; expect the preserved storefront plus durable checkout journeys to pass.
- [ ] Verify logs for the test order do not contain the submitted full phone or delivery location.
