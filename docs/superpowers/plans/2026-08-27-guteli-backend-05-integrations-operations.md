# Güteli Backend 05: Integrations and Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the approved milestone with owner-directed WhatsApp delivery and retries, a fail-closed disabled payment boundary, production object storage, privacy jobs, backup/restore proof, operational documentation, and a final security/regression audit.

**Architecture:** Orders already commit an outbox event. A lightweight in-process dispatcher claims events with PostgreSQL locks and calls a provider interface; disabled or failed providers never alter order acceptance. Payments expose an internal disabled interface only. Storage selects local persistent files in development and S3-compatible objects in production. Operational scripts and documentation make persistence and recovery explicit.

**Tech Stack:** Next.js 16.3.3 instrumentation/`after`, PostgreSQL 17, Drizzle ORM, Meta WhatsApp Cloud API adapter, AWS SDK S3 client, Docker Compose, Vitest, Playwright

**Spec:** [Güteli Backend, Admin, Orders, and Operations Design](../specs/2026-08-27-guteli-backend-admin-orders-design.md)

## Global Constraints

- Complete [Plan 04](2026-08-27-guteli-backend-04-admin.md) first.
- `WHATSAPP_NOTIFICATIONS_ENABLED=false` and `PAYMENTS_ENABLED=false` are safe defaults.
- The WhatsApp destination is the bakery owner's server-side number, never a browser-provided value.
- No result may claim a WhatsApp message was sent until an external provider response proves acceptance.
- No code path may mark an order `PAID` while payments are disabled.
- Deployment, DNS, live provider configuration, and production cutover remain separate approval gates.

---

## Task 1: Build the exact owner notification and provider boundary

**Files:**

- Modify: `.env.example`
- Modify: `src/server/config/env.ts`
- Create: `src/server/notifications/types.ts`
- Create: `src/server/notifications/build-owner-message.ts`
- Create: `src/server/notifications/disabled-provider.ts`
- Create: `src/server/notifications/meta-whatsapp-provider.ts`
- Create: `src/server/notifications/provider.ts`
- Test: `tests/unit/owner-notification.test.ts`
- Test: `tests/unit/whatsapp-provider.test.ts`

**Interfaces:**

- Produces `NotificationProvider.sendOwnerOrderCreated(message)` returning typed `accepted`, `disabled`, `retryable_failure`, or `permanent_failure` results.
- Message includes public order ID, customer name, full phone, fulfillment, full delivery location when applicable, requested date, product names/quantities, subtotal, delivery quote state, notes when present, and authenticated admin link.
- Message excludes receipt token, session/auth data, internal UUID, payment/card data, raw errors, and unrelated customer records.

```ts
export interface NotificationProvider {
  sendOwnerOrderCreated(
    message: OwnerOrderMessage,
  ): Promise<NotificationResult>;
}
```

- [ ] Write message snapshot tests for pickup and delivery. Assert delivery includes the full submitted phone/location and pickup omits location; assert the destination never comes from order input.
- [ ] Write fake-transport tests for disabled configuration, provider `2xx`, `429`, `5xx`, timeout, invalid JSON, and nonretryable `4xx`, including log-redaction assertions.
- [ ] Run focused tests; expect missing-module failures.
- [ ] Add server-only settings for enabled flag, API base/version, phone-number ID, access token, owner destination, approved template name/language, app secret, verify token, and public admin base URL. Parse provider credentials conditionally only when enabled.
- [ ] Implement the disabled provider and a Meta adapter around an injected HTTP transport. Send only to `OWNER_WHATSAPP_DESTINATION`; set bounded connect/response timeouts and map provider responses to safe codes without storing/logging bodies containing recipient data.
- [ ] Use the externally approved template contract when enabled. Treat absent account, recipient consent, template, token, or destination as `disabled`, never `accepted`.
- [ ] Run focused tests; expect success.
- [ ] Commit: `git add .env.example src/server/config/env.ts src/server/notifications tests/unit/owner-notification.test.ts tests/unit/whatsapp-provider.test.ts && git commit -m "feat: add owner whatsapp provider boundary"`.

## Task 2: Dispatch the outbox with retry and admin visibility

**Files:**

- Modify: `src/server/db/schema/operations.ts`
- Create: next generated migration under `drizzle/` if an outbox state/index changes
- Create: `src/server/notifications/claim-outbox.ts`
- Create: `src/server/notifications/process-outbox.ts`
- Create: `src/server/notifications/processor-loop.ts`
- Create: `src/instrumentation.ts`
- Modify: `src/app/api/orders/route.ts`
- Create: `src/app/api/admin/orders/[id]/retry-notification/route.ts`
- Modify: `src/app/admin/orders/[id]/page.tsx`
- Create: `src/components/admin/RetryNotificationButton.tsx`
- Test: `tests/integration/notification-outbox.test.ts`
- Test: `tests/browser/admin-notification.spec.ts`

**Interfaces:**

- Claims due events with `FOR UPDATE SKIP LOCKED`, a lease timestamp, and bounded batch size.
- Retry schedule is 1, 5, 15, 60, and 360 minutes; after six failed attempts state is `FAILED` until an authorized manual retry.
- Disabled configuration uses `BLOCKED` with safe code `NOT_CONFIGURED`, visible in admin and never labeled sent.

```sql
SELECT id
FROM outbox_events
WHERE state = 'PENDING' AND next_attempt_at <= now()
ORDER BY next_attempt_at
FOR UPDATE SKIP LOCKED
LIMIT 20;
```

- [ ] Write integration tests for post-commit processing, two simultaneous claimers, lease recovery, disabled provider, retry schedule, permanent failure, maximum attempts, manual retry authorization, and order survival under every failure.
- [ ] Add a browser test showing Pending, Not configured, Sent, or Failed status and owner-only retry behavior without displaying provider secrets/errors.
- [ ] Run focused suites; expect missing-processor failures.
- [ ] Implement transactional claiming and state transitions. Load necessary PII from the order only after claim, build one owner message, release it after the provider call, and store only provider message ID plus safe result code.
- [ ] Start one unref'ed polling loop from `src/instrumentation.ts` only in the Node.js runtime and only when processing is enabled. Stop claims on `SIGTERM`; rely on leases for interrupted work.
- [ ] In `POST /api/orders`, use Next.js `after()` only to request an immediate bounded dispatch after the response; durable retry remains in PostgreSQL and does not depend on `after()` completion.
- [ ] Require `requireAdmin()` and an audit event for manual retry; reject retry for `SENT` or currently leased events.
- [ ] Run focused suites with two processor instances; expect exactly one provider attempt per claim and intact orders.
- [ ] Commit: `git add src/server/db/schema/operations.ts drizzle src/server/notifications src/instrumentation.ts src/app/api/orders src/app/api/admin/orders src/app/admin/orders src/components/admin/RetryNotificationButton.tsx tests/integration/notification-outbox.test.ts tests/browser/admin-notification.spec.ts && git commit -m "feat: deliver owner notifications from outbox"`.

## Task 3: Add verified callback handling only behind configuration

**Files:**

- Create: `src/server/notifications/verify-callback.ts`
- Create: `src/server/notifications/record-callback.ts`
- Create: `src/app/api/integrations/whatsapp/callback/route.ts`
- Modify: `src/server/db/schema/operations.ts`
- Create: next generated migration under `drizzle/`
- Test: `tests/integration/whatsapp-callback.test.ts`

**Interfaces:**

- GET verification succeeds only with the configured verify token.
- POST requires the provider's official signature over raw bytes and records a unique provider event/message status without PII payload retention.
- Route fails closed with `404` when the integration is disabled.

```ts
export function verifyCallbackSignature(
  rawBody: Uint8Array,
  signature: string,
): boolean {
  const supplied = signature.startsWith('sha256=') ? signature.slice(7) : '';
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false;
  const expected = createHmac('sha256', getServerEnv().WHATSAPP_APP_SECRET)
    .update(rawBody)
    .digest();
  return timingSafeEqual(expected, Buffer.from(supplied, 'hex'));
}
```

- [ ] Re-read the current official Meta callback signature and verification documentation before implementing this task; record the verified API version in `BACKEND_ARCHITECTURE.md` later.
- [ ] Add tests for disabled route, bad verify token, bad/missing signature, valid signature, malformed payload, duplicate event, out-of-order status, and unknown message ID.
- [ ] Run the focused suite; expect route-not-found failures.
- [ ] Implement constant-time token/signature checks on raw request bytes, strict event parsing, a unique provider-event identifier, and monotonic delivery-state updates.
- [ ] Store only safe IDs/status/timestamps. Do not persist the callback's phone, profile name, message body, full payload, signature, or access token.
- [ ] Run the focused suite; expect success.
- [ ] Commit: `git add src/server/notifications src/app/api/integrations/whatsapp src/server/db/schema/operations.ts drizzle tests/integration/whatsapp-callback.test.ts && git commit -m "feat: verify whatsapp delivery callbacks"`.

## Task 4: Add the disabled payment boundary

**Files:**

- Modify: `.env.example`
- Modify: `src/server/config/env.ts`
- Create: `src/server/payments/types.ts`
- Create: `src/server/payments/disabled-provider.ts`
- Create: `src/server/payments/provider.ts`
- Test: `tests/unit/payments-disabled.test.ts`
- Test: `tests/integration/payments-disabled.test.ts`

**Interfaces:**

- Produces `PaymentProvider.createCheckout()` and `handleWebhook()` interfaces for a future approved provider.
- Current implementation always returns typed `PAYMENTS_DISABLED` and never mutates `paymentStatus`.
- No public checkout or webhook route is created in this milestone.

```ts
export interface PaymentProvider {
  createCheckout(input: PaymentCheckoutInput): Promise<PaymentCheckoutResult>;
  handleWebhook(input: PaymentWebhookInput): Promise<PaymentWebhookResult>;
}
```

- [ ] Write unit tests proving both provider operations fail closed and contain no invented provider URL/reference.
- [ ] Write an integration test enumerating all public/admin routes and direct payment service calls; assert none can change an order from `UNPAID`.
- [ ] Run focused tests; expect missing-module failures.
- [ ] Add `PAYMENTS_ENABLED=false` to `.env.example`; make configuration reject `true` with `PAYMENT_PROVIDER_NOT_CONFIGURED` until a future migration and provider implementation are approved.
- [ ] Implement the disabled provider and expose it as the only provider from `provider.ts`. Do not create payment attempt or webhook tables.
- [ ] Run focused tests; expect success.
- [ ] Commit: `git add .env.example src/server/config/env.ts src/server/payments tests/unit/payments-disabled.test.ts tests/integration/payments-disabled.test.ts && git commit -m "feat: keep payments explicitly disabled"`.

## Task 5: Add production S3-compatible object storage

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Modify: `src/server/config/env.ts`
- Create: `src/server/storage/s3-storage.ts`
- Modify: `src/server/storage/index.ts`
- Test: `tests/unit/s3-storage.test.ts`
- Test: `tests/integration/storage-contract.test.ts`

**Interfaces:**

- `STORAGE_DRIVER=local|s3`; production configuration rejects local unless an explicit single-host override is acknowledged.
- S3 adapter satisfies the same put/read/delete/public URL contract as local storage.
- Bucket is private; media reads use the application route or bounded signed URLs, never public listing.

```ts
export function getStorageProvider(): ObjectStorage {
  return getServerEnv().STORAGE_DRIVER === 's3'
    ? new S3Storage(getServerEnv())
    : new LocalStorage(getServerEnv().UPLOADS_ROOT);
}
```

- [ ] Add contract tests shared by local and a fake S3 transport for safe keys, idempotent seed copy, content type, failure mapping, deletion, and path traversal rejection.
- [ ] Run focused tests; expect missing S3 adapter failure.
- [ ] Run `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`; commit resolved lockfile versions.
- [ ] Implement conditional S3 configuration for endpoint, region, bucket, access key, secret, and path style. Never allow browser-supplied bucket/key or log signed URLs.
- [ ] Update media serving to stream through the adapter with content-type allowlisting and bounded cache policy; verify an object-storage failure returns safe `503` without changing product metadata.
- [ ] Run focused tests; expect success.
- [ ] Commit: `git add package.json package-lock.json .env.example src/server/config/env.ts src/server/storage tests/unit/s3-storage.test.ts tests/integration/storage-contract.test.ts && git commit -m "feat: support production object storage"`.

## Task 6: Add privacy anonymization and safe structured logging

**Files:**

- Create: `src/server/observability/logger.ts`
- Create: `src/server/privacy/anonymize-orders.ts`
- Create: `src/server/privacy/prune-audit-logs.ts`
- Create: `scripts/run-maintenance.ts`
- Modify: `package.json`
- Test: `tests/unit/logger-redaction.test.ts`
- Test: `tests/integration/privacy-maintenance.test.ts`

**Interfaces:**

- Logs allow only event code, request ID, actor/order ID, result, duration, and safe error code.
- Default order-PII retention is 180 days after completion/cancellation; default safe audit retention is 365 days.
- Maintenance is idempotent, batched, auditable, and supports `--dry-run`.

```ts
export function logOperationalEvent(event: SafeOperationalEvent): void {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}
```

- [ ] Add property/table-driven tests feeding secrets and PII through every logger field; assert values never appear in serialized output.
- [ ] Add integration tests around retention cutoffs, nonterminal orders, already anonymized rows, item snapshots, dry run, batch retry, and maintenance audit events.
- [ ] Run focused tests; expect missing-module failures.
- [ ] Implement an allowlist logger rather than recursive best-effort redaction. Replace existing request/provider exception logs with safe codes at their source.
- [ ] Implement transactionally batched anonymization of name, phone, location, and notes while retaining non-PII order/item snapshots; prune audit rows past the configured cutoff.
- [ ] Add `npm run maintenance` and document that retention values require accounting/legal review before production.
- [ ] Run focused tests; expect success.
- [ ] Commit: `git add package.json src/server/observability src/server/privacy scripts/run-maintenance.ts tests/unit/logger-redaction.test.ts tests/integration/privacy-maintenance.test.ts && git commit -m "feat: add privacy retention maintenance"`.

## Task 7: Prove backup, restore, and persistent restart behavior

**Files:**

- Create: `scripts/backup-database.sh`
- Create: `scripts/restore-database.sh`
- Create: `scripts/backup-uploads.sh`
- Create: `docs/operations/BACKUP_RESTORE.md`
- Create: `tests/operations/restore-drill.sh`
- Modify: `package.json`

**Interfaces:**

- Backup writes PostgreSQL custom format plus a checksummed uploads archive to an explicitly supplied output directory.
- Restore requires an explicitly supplied empty target database and storage directory; it refuses production-like names unless a separate confirmation flag is present.
- No script deletes Docker volumes or overwrites a nonempty target silently.

```sh
pg_dump --format=custom --no-owner --no-acl --file "$backup_file" "$source_url"
pg_restore --exit-on-error --no-owner --no-acl --dbname "$target_url" "$backup_file"
```

- [ ] Write the restore drill first: migrate/seed an isolated source, create an admin/order/image, back it up, restore to an empty isolated target, and verify migrations, counts, login record, order snapshot, and image checksum.
- [ ] Run `bash tests/operations/restore-drill.sh`; expect failure because scripts do not exist.
- [ ] Implement `pg_dump --format=custom --no-owner --no-acl` and `pg_restore --exit-on-error --no-owner --no-acl` wrappers with quoted explicit paths, `umask 077`, checksum manifests, version output, and failure cleanup limited to their newly created temporary directory. The restore wrapper must verify the target database is empty instead of using `--clean`.
- [ ] Implement upload archive backup/restore without following symlinks and document off-host encrypted storage, access restriction, object-storage versioning, and retention.
- [ ] Run the restore drill; expect full proof on isolated names without touching local development volumes.
- [ ] Restart `docker compose` with ordinary `down`/`up` and verify products, orders, users, and uploads persist.
- [ ] Commit: `git add package.json scripts/backup-database.sh scripts/restore-database.sh scripts/backup-uploads.sh docs/operations/BACKUP_RESTORE.md tests/operations/restore-drill.sh && git commit -m "ops: prove backup and restore workflow"`.

## Task 8: Complete documentation and final attack-oriented verification

**Files:**

- Modify: `README.md`
- Modify: `AI/AI-EOS/CURRENT_TASK.md`
- Modify: `AI/AI-EOS/19_DECISION_LOG.md`
- Create: `BACKEND_ARCHITECTURE.md`
- Create: `ADMIN_GUIDE.md`
- Modify: `.env.example`
- Create: `tests/security/attack-surface.test.ts`

**Interfaces:**

- Documentation distinguishes implemented local behavior, disabled integrations, and `REQUIRES EXTERNAL CONFIGURATION` production items.
- Final report uses `WHAT I FOUND`, `WHAT I CHANGED`, `FILES CHANGED`, `TESTS RUN`, `RESULTS`, and `RISKS / TODO`.

```ts
describe('attack surface', () => {
  it(
    'keeps price, authorization, provider, upload, and persistence boundaries closed',
  );
});
```

- [ ] Write an attack-surface test covering anonymous admin access, browser price injection, duplicate idempotency, stock race, invalid transitions, upload traversal/spoofing, callback forgery/replay, secret/PII logging, WhatsApp failure, payment mutation, and persistence after restart.
- [ ] Run the focused security test; fix only evidenced failures and rerun until it passes.
- [ ] Update README with exact Docker, migration, seed, owner creation, MFA, maintenance, backup, restore, test, and dynamic-host commands. State that the current static Sites target cannot host the backend.
- [ ] Update current task and append approved decisions without deleting useful history. Create architecture flows and a Spanish nontechnical admin guide.
- [ ] Run `rg -n "(access[_-]?token|client[_-]?secret|BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|postgresql://[^[:space:]]+:[^@[:space:]]+@)" --hidden --glob '!node_modules/**' --glob '!.git/**'`; inspect every result and ensure only placeholders/test fixtures exist.
- [ ] Run `npm run format:check && npm run lint && npm run typecheck && npm test`; expect success.
- [ ] Run all integration tests against a new migrated/seeded database; expect success.
- [ ] Run `npm run build && npm run test:e2e`; expect all public/admin/failure journeys to pass.
- [ ] Run the restore drill and `docker compose up --build` health/persistence checks; expect success.
- [ ] Run `git diff --check` and inspect `git status --short`; verify no secrets, generated runtime data, backups, uploads, or `products/` are staged.
- [ ] Commit: `git add README.md AI/AI-EOS/CURRENT_TASK.md AI/AI-EOS/19_DECISION_LOG.md BACKEND_ARCHITECTURE.md ADMIN_GUIDE.md .env.example tests/security/attack-surface.test.ts && git commit -m "docs: complete backend operations handoff"`.
