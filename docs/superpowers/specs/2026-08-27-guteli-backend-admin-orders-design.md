# Güteli Backend, Admin, Orders, and Operations Design

**Date:** 2026-08-27

**Status:** Approved by the owner on 2026-08-27

**Scope:** Single-store backend, persistent catalog and orders, owner administration, image storage, owner WhatsApp notifications, Docker development, and provider-disabled payments

## Outcome

Convert the existing Next.js static storefront into an operable, same-origin, full-stack application without redesigning the approved customer experience. The server becomes authoritative for products, prices, availability, order identifiers, totals, permissions, and integration state. PostgreSQL persists business data. The owner can manage products and orders from a protected `/admin` area without editing code or redeploying for catalog changes.

This design deliberately remains a single modular application. It does not add Kubernetes, microservices, Redis, RabbitMQ, WebSockets, multiple databases, customer accounts, or a separate worker service.

## Approved assumptions

- Güteli is one bakery operating in one region, with one owner and a small number of optional administrators.
- Customers do not create accounts.
- Order volume is small to medium and the initial production deployment uses one application instance.
- Güteli manually confirms orders, delivery costs, and customer arrangements.
- Online payment processing is disabled until a provider, account, tax treatment, credentials, and webhook contract are explicitly approved.
- Automated owner WhatsApp delivery requires separate external Meta/WhatsApp configuration; orders remain valid when notification delivery is unavailable.
- Existing design, branding, product photographs, responsive behavior, and customer routes are preserved unless integration requires a focused change.
- The untracked `products/` directory contains original source assets and must not be modified, moved, overwritten, optimized, staged, or deleted.

## Architecture decision

### Selected approach: modular Next.js monolith

```text
CUSTOMER OR OWNER
        |
        v
NEXT.JS APPLICATION
  - public storefront
  - checkout and receipt
  - protected admin UI
  - route-handler API
  - application services
  - domain policies
  - integration adapters
        |
        +---- PostgreSQL
        +---- local/object image storage
        +---- WhatsApp provider when enabled
        `---- payment provider boundary, disabled
```

The current `output: 'export'` configuration must be removed because static export cannot accept dynamic POST requests, use database-backed sessions, receive webhooks, or persist orders. Next.js runs as a Node.js server in a multi-stage, non-root container. Public UI, API, and admin share one origin, avoiding cross-origin cookies and duplicated deployments.

### Alternatives rejected

1. **Static Sites frontend plus independent API:** preserves the current static host but requires two deployments, CORS, cross-domain authentication, client-only catalog loading, and more operational configuration.
2. **Managed backend platform:** shortens initial setup but adds vendor policy and local/production parity concerns that are not justified for one bakery.

The current static deployment may remain available while development occurs. It is not capable of hosting the completed backend and must not be treated as the production target for this milestone.

## Module boundaries

The implementation keeps route files thin and places business rules in focused server modules:

```text
src/
  app/
    api/                 HTTP parsing and response mapping
    admin/               protected owner UI
    order/confirmation/  customer receipt/status UI
  server/
    auth/                Better Auth configuration and authorization
    db/                  Drizzle connection, schema, and repositories
    products/            catalog use cases and policies
    orders/              pricing, creation, transitions, and quoting
    notifications/       outbox and WhatsApp adapters
    payments/            disabled provider boundary
    storage/             local and object-storage adapters
    observability/       request IDs, audit events, and safe logging
  domain/                framework-independent value and policy types
drizzle/                 version-controlled SQL migrations
```

Routes validate transport input, call one application use case, and convert typed results to HTTP responses. Database queries, authentication, provider SDKs, and environment access stay server-only.

## Database and migrations

Use PostgreSQL with Drizzle ORM and Drizzle Kit. TypeScript schema is the application model; generated SQL migrations are committed and applied with `drizzle-kit migrate`. Production schema changes never use `drizzle-kit push` or manual edits as a migration substitute.

Better Auth uses its official Drizzle adapter so authentication tables participate in the same migration history. Better Auth provides email/password authentication, database sessions, TOTP, and backup codes. Public signup is disabled.

### Core entities

#### `AdminUser` and authentication tables

- Better Auth user, account, session, verification, and 2FA records.
- Application role: `OWNER` or `ADMIN`.
- Account state: active or disabled.
- Only an authenticated owner can create, disable, or change an administrator role.

#### `Category`

- `id`, `name`, `slug`, `active`, `sortOrder`, timestamps.
- Slug is unique; inactive categories cannot receive new public products.

#### `Product`

- `id`, `categoryId`, `name`, `slug`, `description`, `saleUnit`.
- `priceMinor` as integer GTQ centavos.
- Optional `sku` and optional `stockQuantity`.
- `active`, `featured`, `sortOrder`, timestamps, and `deletedAt`.
- Each current menu option remains one sellable product. Variants, compare-at prices, cost accounting, coupons, and promotions are excluded until a business need exists.

`stockQuantity = null` disables inventory tracking for that product. A numeric value enables transactional availability checks and atomic decrement without allowing a negative result.

#### `ProductImage`

- `id`, `productId`, storage key, MIME type, dimensions, sort order, timestamps.
- Storage keys are generated by the server and never derived directly from a supplied filename.

#### `Order`

- Internal UUID primary key.
- Unique, non-sequential public ID such as `GUT-26-K7M4P9Q2`.
- Customer name and phone.
- Fulfillment, requested date, delivery location when required, and optional notes.
- `subtotalMinor`, nullable `shippingMinor`, and nullable `totalMinor`.
- Separate `orderStatus` and `paymentStatus`.
- High-entropy receipt access token stored only as a hash.
- Creation/update timestamps and privacy-anonymization timestamp.

#### `OrderItem`

- `orderId` and source `productId`.
- Snapshots of product name, category label, sale unit, unit price, quantity, and line total.
- Historical snapshots remain unchanged when a current product is edited or deactivated.

#### Supporting records

- `IdempotencyRecord`: key, canonical request hash, order ID, and expiration.
- `RateLimitBucket`: HMAC-derived subject, policy, window, and count.
- `OutboxEvent`: notification type, payload reference, attempts, next attempt, state, and last safe error code.
- `AuditLog`: actor ID, action, entity, entity ID, request ID, safe metadata, and timestamp.

Payment attempts and provider webhook-event tables are not created while payments are disabled. The provider-activation milestone adds them with its verified provider contract.

## Product migration and catalog behavior

An idempotent seed imports the ten approved current products, exact prices, categories, sale-unit labels, ordering, and optimized images already present under `public/images/products/`. It copies those optimized runtime assets into the configured storage adapter only when missing. It does not read from or write to `products/` as part of normal startup.

The public catalog reads active products from PostgreSQL. Admin product mutations invalidate the catalog cache or use request-time data so additions and edits appear without a code commit or deployment. The browser cart continues to store only product IDs and quantities under a versioned key; customer PII is never put in local storage.

## Public order contract

### Request

```http
POST /api/orders
Content-Type: application/json
Idempotency-Key: <random UUID>
```

```json
{
  "customer": {
    "name": "María López",
    "phone": "+502 5555-5555"
  },
  "fulfillment": "DELIVERY",
  "requestedDate": "2026-08-30",
  "location": "Dirección proporcionada por el cliente",
  "notes": "Instrucciones opcionales",
  "items": [
    {
      "productId": "server-issued-uuid",
      "quantity": 2
    }
  ]
}
```

The request schema rejects unknown authoritative fields. In particular, the browser cannot set price, subtotal, shipping, total, discount, stock, availability, order ID, order status, payment status, user ID, or role.

### Server transaction

1. Generate or accept a valid request ID and perform safe transport limits.
2. Validate type, length, format, required fields, permitted characters, quantity range, fulfillment rules, and Guatemala-local advance date.
3. Resolve an existing idempotency record before consuming a new-order limit so a safe retry can return its original result.
4. Apply PostgreSQL-backed rate limits to HMAC-derived IP and normalized-phone subjects.
5. Load every active product from PostgreSQL and reject missing or unavailable items.
6. Use stored `priceMinor` values; ignore any browser-calculated amounts.
7. Verify tracked stock and decrement it atomically when enabled.
8. Calculate line totals and subtotal with integer arithmetic and checked bounds.
9. Create order, snapshots, idempotency record, audit event, and owner-notification outbox record in one transaction.
10. Commit before attempting any external notification.
11. Return the server-created receipt.

If any transactional operation fails, no partial order, item, stock change, or outbox event remains.

### Idempotency behavior

- Same key plus the same canonical request returns the existing order.
- Same key plus different content returns `409 IDEMPOTENCY_CONFLICT`.
- A unique database constraint is the final race-condition defense.
- UI button disabling is retained only as a usability measure.

### Server-owned totals

- Pickup: `totalMinor = subtotalMinor`.
- Delivery: `shippingMinor` and `totalMinor` remain `null` until the owner enters a delivery quote.
- An authenticated quote action sets `shippingMinor`; the server calculates `totalMinor` and audits the change.
- The UI says delivery cost and total are pending rather than inventing a final amount.

## Order and payment states

### Order flow

```text
RECEIVED
   |
   v
CONFIRMED
   |
   v
PREPARING
   |
   v
READY ----------------> COMPLETED
   |
   v
OUT_FOR_DELIVERY -----> COMPLETED
```

`CANCELLED` is allowed from non-terminal states. `COMPLETED` and `CANCELLED` are terminal. The server owns a transition table and rejects arbitrary jumps. Every accepted transition is audited.

### Payment flow

The field exists independently with values `UNPAID`, `PENDING`, `PAID`, `FAILED`, and `REFUNDED`, but this milestone creates orders only as `UNPAID` and exposes no public or admin transition capable of claiming payment.

`PAYMENTS_ENABLED=false` is the required default. `DisabledPaymentsProvider` rejects all operations with a stable `PAYMENTS_DISABLED` result. There is no mock success path, public success callback, or provider webhook route. Provider selection, tax review, hosted checkout, amount/currency verification, signature verification, provider-event idempotency, refunds, and payment transitions form a separate approved milestone.

## Customer checkout and receipt

Preserve the current layout and visual language. Replace local summary-only submission with an API-backed state machine:

```text
EDITING -> SUBMITTING -> SUCCESS
                    `-> ERROR -> SAFE RETRY
```

- Disable duplicate interaction and announce `Enviando pedido...` while submitting.
- Reuse the same idempotency key for retrying the same checkout attempt.
- Keep cart and form data after validation, network, rate-limit, or server failure.
- Clear the cart only after receiving a valid server order.
- Show `¡Pedido recibido!`, public order ID, authoritative subtotal, delivery-quote state, and order status.
- Show a privacy notice explaining that name, phone, location, and operational notes are used to process, contact, and coordinate the order, including notification to the Güteli owner through WhatsApp when configured.

A random receipt token, not the public order ID alone, authorizes a minimal customer status response. The server stores only its hash. The status view does not expose full PII after initial confirmation.

## Owner authentication and authorization

Use Better Auth with PostgreSQL-backed sessions and its official Next.js integration. The owner account is created through an interactive repository command that reads the password without echo and does not place it in environment files, process arguments, or shell history. Public signup remains disabled.

Security requirements:

- `HttpOnly`, production `Secure`, same-origin cookies with an appropriate `SameSite` policy.
- Server-side session and role verification inside the data-access layer for every admin mutation and sensitive read.
- TOTP plus backup codes must be enrolled before production use.
- Session revocation and logout-all-devices.
- Login throttling by HMAC-derived IP/account subject and progressive delay.
- Origin/CSRF checks for state-changing admin requests.
- Reauthentication for role changes, account disablement, and destructive product actions.
- No authorization decision based only on hidden UI, client state, route obscurity, or middleware/proxy checks.

`/admin` uses `noindex`, but its URL is not considered secret.

## Admin experience

### Dashboard

- Received and pending orders.
- Orders for the current Guatemala-local day.
- Active, unavailable, and low-stock products.
- Failed owner notifications requiring attention.
- Thirty-second polling while the page is active; no WebSockets.

### Products and categories

- Create, edit, duplicate, activate/deactivate, feature, order, and safely delete products.
- Edit name, description, sale unit, price, category, SKU, stock, and images.
- Create, edit, deactivate, and order categories.
- Soft-delete a product referenced by historical orders.

### Orders

- List public ID, date, customer, subtotal/total state, fulfillment, order status, and payment status.
- Show line snapshots, contact, delivery details, requested date, operational notes, status history, and notification state.
- Enter delivery quote and perform only valid order transitions.
- Retry a failed owner notification.

Complex analytics, customer accounts, bulk marketing, live chat, and arbitrary payment-state editing are excluded.

## Image storage and upload security

`StorageProvider` has two implementations:

- local persistent files mounted at `uploads_data` for development;
- S3-compatible object storage for production.

Uploads are server-side only and require an authenticated authorized role. The application verifies extension, declared MIME, magic bytes, decoded image format, maximum 8 MB input size, and bounded dimensions. It permits JPEG, PNG, and WebP, re-encodes accepted content to WebP, strips metadata, assigns a random storage key, and never executes user content. Remote-URL imports and SVG uploads are excluded.

Replacing an image writes the new object before updating the database. Old objects are deleted only after they are unreferenced and after the database change succeeds. Storage failures do not corrupt the product record.

## Owner WhatsApp notification

The notification is addressed to the Güteli owner's configured WhatsApp number, not to the customer:

```text
Customer confirms checkout
        |
        v
Server commits order and outbox event
        |
        v
WhatsApp provider sends to OWNER_WHATSAPP_DESTINATION
```

The operational message includes:

- public order ID;
- customer name and full phone;
- pickup or delivery;
- full delivery location when applicable;
- requested date;
- product names and quantities;
- subtotal and delivery-quote state;
- operational notes when present;
- authenticated admin-order link.

It excludes passwords, tokens, cookies, card/payment data, internal errors, roles, and unrelated customer data. This is intentional data minimization: phone and delivery location are necessary for confirmation and fulfillment.

`WHATSAPP_NOTIFICATIONS_ENABLED=false` is the safe default. When disabled, the order remains visible in `/admin` and the notification is recorded as not configured rather than falsely sent. When enabled, credentials and `OWNER_WHATSAPP_DESTINATION` are server-only and the Meta/WhatsApp account, owner-recipient consent, approved message template, callback configuration, and production secrets are marked `REQUIRES EXTERNAL CONFIGURATION`.

The application includes a provider interface, disabled provider, and official-provider adapter whose HTTP behavior is tested with a fake transport. Live delivery cannot be claimed until a real account and recipient prove it. If provider callbacks are enabled, the route verifies the official signature/token, validates payloads, rejects replay or duplicates, and records only safe delivery metadata.

An outbox event is committed with the order. A lightweight processor in the application claims due rows using PostgreSQL locking, attempts delivery after commit, applies bounded exponential backoff, and marks a final failure for admin retry. PostgreSQL coordination prevents duplicate processing if the application later runs more than one instance. Notification failure never rolls back or deletes the order.

## Rate limiting and abuse controls

Initial configurable policies:

- Order endpoint: 10 attempts per 15 minutes per HMAC-derived IP subject.
- Successfully created orders: 5 per 30 minutes per normalized-phone HMAC subject.
- Login: 5 failed attempts per 15 minutes per combined account/IP subject, followed by progressive delay.
- Uploads: authenticated request and byte/dimension limits in addition to an endpoint limit.

Raw IPs are not persisted for these policies. A rotating server secret derives HMAC subjects. A future CDN/WAF may apply a coarser external limit, but application controls remain authoritative.

## Error contract

```json
{
  "error": {
    "code": "PRODUCT_OUT_OF_STOCK",
    "message": "Uno de los productos ya no está disponible.",
    "requestId": "req_opaque"
  }
}
```

Stable codes distinguish validation, missing product, inactive product, out of stock, idempotency conflict, rate limit, authentication, authorization, payments disabled, upload rejection, notification configuration, and internal failure. Field errors may include field names and safe Spanish messages. Responses never expose stack traces, SQL, environment values, provider secrets, internal paths, or raw exceptions.

## Logging, audit, and privacy

Structured operational logs contain event code, request ID, order ID or actor ID, result, duration, and safe error classification. They never contain passwords, password hashes, cookies, access tokens, refresh/session tokens, WhatsApp/payment secrets, full addresses, full phones, full emails, customer notes, card data, or complete request bodies.

The database necessarily stores customer contact and delivery data to operate the order. Access is restricted to authorized roles. Backups and production storage must be encrypted by the selected provider. Logs use IDs rather than PII.

The initial application policy anonymizes customer name, phone, location, and notes 180 days after completion or cancellation while retaining non-PII order/item snapshots. Audit logs retain safe metadata for 365 days. Both periods are configurable and must be reviewed with the owner's accounting/legal adviser before production; this design does not claim a statutory retention rule.

Audit actions include login events, product/category creation and update, price and stock changes, product deactivation, delivery quoting, order transitions, notification retries, administrator changes, and privacy anonymization.

## Threat model

| Threat                           | Primary mitigation                                               | Residual risk                                                                  |
| -------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Browser changes prices or totals | Server lookup and integer recalculation                          | Compromised database/admin can still change current price; audit price changes |
| Duplicate click, retry, or race  | Idempotency record, request hash, unique constraint, transaction | Deliberate new keys are handled by rate limiting                               |
| Overselling tracked stock        | Locked/conditional atomic decrement                              | Stock accuracy still depends on owner updates and offline sales                |
| Admin impersonation              | Better Auth, DB sessions, MFA, server authorization, throttling  | Compromised owner device remains an operational risk                           |
| CSRF or forged admin request     | Same-origin cookies, origin/CSRF validation, reauthentication    | Browser compromise/XSS requires CSP and dependency hygiene                     |
| Malicious upload                 | Decode, limit, re-encode, random key, no SVG                     | Decoder-library vulnerabilities require patching                               |
| Notification replay/duplication  | Outbox claim/locking and provider event IDs                      | Provider may deliver duplicate visible messages; record and surface state      |
| PII leakage in logs              | Structured allowlist fields and redaction tests                  | Authorized owner still receives necessary PII in WhatsApp                      |
| Database/container restart       | PostgreSQL volume, migrations, backups, restore drill            | Host-volume loss requires off-host backup                                      |
| Provider outage                  | Commit order before notification and retry from outbox           | Owner must monitor admin failures while provider is unavailable                |
| Fake payment success             | Payments disabled and no transition route                        | Future provider activation requires a new threat review                        |

## API surface

### Public

- `GET /api/products`
- `GET /api/products/:slug`
- `POST /api/orders`
- `GET /api/order-status/:receiptToken`
- Better Auth login/session endpoints required for the protected owner flow
- `GET /health`

### Admin

- `GET|POST /api/admin/categories`
- `PATCH|DELETE /api/admin/categories/:id`
- `GET|POST /api/admin/products`
- `GET|PATCH|DELETE /api/admin/products/:id`
- `POST /api/admin/products/:id/duplicate`
- `POST /api/admin/uploads`
- `GET /api/admin/orders`
- `GET /api/admin/orders/:id`
- `PATCH /api/admin/orders/:id/status`
- `PATCH /api/admin/orders/:id/delivery-quote`
- `POST /api/admin/orders/:id/retry-notification`

Every admin route performs a secure server-side session/role check. Pagination and maximum page sizes are mandatory. `DELETE` means safe deactivation/soft deletion where historical references exist.

Provider callback routes exist only for configured integrations and fail closed when disabled.

## Docker and local development

```text
docker compose up --build
        |
        +---- app       Next.js full-stack, non-root
        `---- database  PostgreSQL, internal network only

volumes:
  db_data
  uploads_data
```

The application image uses official base images, a multi-stage build, production dependencies only, a non-root runtime user, `.dockerignore`, and no baked secrets. PostgreSQL is reachable by the application service but does not require a public production port. Compose health checks order readiness without treating a temporary database delay as data loss.

`docker compose down` preserves data. Volume deletion is never part of normal project commands. Migrations and the idempotent catalog seed use explicit documented commands. Owner creation uses an interactive command such as `docker compose run --rm app npm run owner:create` and does not accept a plaintext password argument.

`/health` returns only service state and a request ID. It verifies necessary database connectivity without exposing versions, connection strings, environment variables, or internal network details.

## Backup and restore

- Document a consistent PostgreSQL `pg_dump` backup and restore into an empty database.
- Back up local upload storage for development and configure versioning/retention for production object storage.
- Store backups off the application host with restricted access.
- A backup is accepted only after a restore drill proves migrations, products, orders, admin access, and image references in an isolated environment.

## Production boundary

The completed system requires a Node/container host, PostgreSQL, object storage, TLS/domain configuration, secrets management, off-host backups, monitoring, and WhatsApp Business configuration. These are `REQUIRES EXTERNAL CONFIGURATION` and are not complete merely because adapters or environment placeholders exist.

The current static Sites build cannot host this runtime. Production cutover, DNS, provider dashboards, and live deployment require separate authorization. Database and object storage must persist independently from an application image or deployment.

## Verification strategy

### Unit tests

- Money arithmetic and bounds.
- Order validation and Guatemala-local date rule.
- State-transition table.
- Canonical idempotency hashing.
- Product availability and optional-stock policies.
- Error mapping and PII-safe log serialization.
- Payment provider fail-closed behavior.
- WhatsApp message content addressed to the owner.

### PostgreSQL integration tests

- Generated migrations apply to an empty database.
- Seed is idempotent and imports exactly the approved catalog.
- Same idempotency request creates one order.
- Same key with different content conflicts.
- Concurrent tracked-stock orders cannot create negative stock.
- Order, item snapshots, stock change, idempotency, audit, and outbox commit atomically.
- Notification failure leaves the order intact.
- Rate-limit counters update atomically.
- Receipt tokens are stored hashed and public IDs alone cannot retrieve a receipt.

### API and authorization tests

- Browser-supplied price/total is rejected or ignored and never changes server totals.
- Manipulated, oversized, unknown, or invalid fields fail safely.
- Anonymous and wrong-role users cannot read or mutate admin data.
- Owner can perform approved product, category, quote, and order actions.
- Invalid transition fails without data mutation.
- Payments cannot be marked paid while disabled.
- Invalid upload content, MIME mismatch, SVG, excessive bytes, or excessive dimensions is rejected.
- Callback signatures and duplicate events are tested when the callback is enabled.

### Browser tests

- Existing responsive storefront, menu, cart, accessibility, and photographs remain intact.
- Products load from the backend and admin-created products appear without redeploy.
- Checkout shows submitting, success with order ID, understandable error, and safe retry states.
- Double interaction produces one order.
- Failed order creation retains cart and form; successful creation clears the cart.
- Privacy notice is visible before submission.
- Owner login, MFA enrollment/test mode, product management, order detail, delivery quote, status change, and notification retry work.

### Failure and persistence tests

- Persisted order plus unavailable WhatsApp still confirms the customer order.
- Database restart and `docker compose down`/`up` preserve products, orders, users, and uploads.
- Restore into an empty database reproduces the required operational state.
- Health check fails safely when the database is unavailable and reveals no secrets.

Every implementation phase runs applicable format, lint, typecheck, unit/integration/browser tests, production build, `git diff --check`, and secret-pattern checks. Completion requires a final attack-oriented review for authorization bypasses, price trust, race conditions, duplicate orders, upload paths, leaked secrets/PII, invalid status transitions, notification loss, and persistence failure.

## Incremental delivery sequence

1. Runtime conversion, configuration validation, PostgreSQL, Drizzle, migrations, Docker foundation, and health check.
2. Persistent categories/products/images plus idempotent catalog migration and public storefront integration.
3. Order contract, server pricing, snapshots, inventory transaction, idempotency, rate limiting, and receipt tokens.
4. Checkout submitting/success/error/retry/privacy states.
5. Better Auth owner flow, MFA, authorization, audit, and admin products/orders.
6. Secure image upload and storage adapters.
7. Owner-directed WhatsApp adapter, outbox processing, retry, and admin visibility.
8. Payment boundary in disabled fail-closed mode.
9. Docker persistence, backup/restore drill, documentation, full regression suite, and final security audit.

After each phase report `WHAT I FOUND`, `WHAT I CHANGED`, `FILES CHANGED`, `TESTS RUN`, `RESULTS`, and `RISKS / TODO`.

## Documentation deliverables

- Update `README.md` with verified Docker, migrations, owner creation, backup, restore, and production notes.
- Update `AI/AI-EOS/CURRENT_TASK.md` without deleting useful history.
- Append approved architectural decisions to `AI/AI-EOS/19_DECISION_LOG.md`.
- Create `BACKEND_ARCHITECTURE.md` with system boundaries and operational flows.
- Create `ADMIN_GUIDE.md` for non-technical product/order operation.
- Keep `.env.example` to placeholders only; never record live destination numbers, provider tokens, database passwords, or session secrets.

## Definition of done for this milestone

- Products and orders use persistent PostgreSQL data.
- Owner can securely create, edit, duplicate, reorder, activate, and deactivate products.
- New products appear publicly without a code deployment.
- Server validates inputs, owns prices/totals, creates IDs, stores snapshots, and prevents duplicate orders.
- Optional tracked stock cannot become negative.
- Owner can view orders, quote delivery, and perform only valid status transitions.
- Admin endpoints enforce authenticated roles server-side and production MFA is configured.
- Customer checkout has submitting, success/order ID, error, safe retry, privacy, and correct cart-clearing behavior.
- Owner WhatsApp notification contains necessary contact/delivery/order data and remains independent from order persistence.
- WhatsApp secrets are server-only; live delivery is claimed only after external verification.
- Payments remain disabled and cannot be forged as successful.
- Logs and audit records do not leak secrets or unnecessary PII.
- PostgreSQL and images survive ordinary Docker restarts and deployment replacement.
- Backup restoration is proven.
- `products/` remains untouched and untracked.
- Required documentation reflects the implemented system.
- All applicable checks pass with fresh evidence.

## References verified during design

- [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication)
- [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next)
- [Better Auth PostgreSQL support](https://better-auth.com/docs/adapters/postgresql)
- [Better Auth two-factor authentication](https://better-auth.com/docs/plugins/2fa)
- [Drizzle Kit migrations](https://orm.drizzle.team/docs/migrations)
