# Güteli Backend 04: Owner Authentication and Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the bakery owner a protected, MFA-capable admin area for managing orders, products, categories, and product images without code edits or redeployment.

**Architecture:** Better Auth stores users, sessions, accounts, and two-factor records in the same PostgreSQL database through the official Drizzle adapter. Every admin page, Server Action, and route handler calls a server-only authorization data-access layer. Admin mutations use application services, audit events, validation, and reauthentication for critical actions.

**Tech Stack:** Next.js 16.3.3, Better Auth, PostgreSQL 17, Drizzle ORM, Zod, Sharp, Vitest, Playwright

**Spec:** [Güteli Backend, Admin, Orders, and Operations Design](../specs/2026-08-27-guteli-backend-admin-orders-design.md)

## Global Constraints

- Complete [Plan 03](2026-08-27-guteli-backend-03-orders-checkout.md) first.
- There is no public registration route or customer account.
- Roles are `OWNER` and `ADMIN`; only `OWNER` can create/disable admins or change roles.
- Authorization must happen in the server data-access/use-case layer even when the UI or a route layout also checks access.
- Production readiness requires TOTP enrollment and backup codes; never log passwords, TOTP secrets, backup codes, session tokens, phone numbers, or locations.
- Uploaded images are untrusted input and never retain supplied filenames or metadata.

---

## Task 1: Install and migrate Better Auth with registration disabled

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/server/auth/auth.ts`
- Create: `src/server/db/schema/auth.ts` via the Better Auth CLI
- Modify: `src/server/db/schema/index.ts`
- Create: next generated migration under `drizzle/`
- Create: `src/app/api/auth/[...all]/route.ts`
- Test: `tests/integration/auth-config.test.ts`

**Interfaces:**

- Produces `auth`, the single Better Auth server instance, and its Next.js handler.
- Supports email/password, database sessions, TOTP, and backup codes.
- Rejects public sign-up while allowing server-side owner provisioning.

- [ ] Write integration tests proving sign-up is disabled, invalid login is generic, sessions are database-backed, and the auth schema participates in the normal migration history.
- [ ] Run the focused test; expect missing auth modules/routes.
- [ ] Run `npm install better-auth` and record the resolved version in the lockfile. Re-read the installed Better Auth Next.js, Drizzle, and two-factor documentation before coding.
- [ ] Configure `betterAuth` with the official `drizzleAdapter(db, { provider: 'pg', schema })`, `emailAndPassword.enabled=true`, `emailAndPassword.disableSignUp=true`, secure cookie settings in production, and the `twoFactor()` plugin.

```ts
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  plugins: [twoFactor()],
});
```

- [ ] Generate the auth schema with the installed Better Auth CLI into `src/server/db/schema/auth.ts`; add application columns `role` (`OWNER|ADMIN`) and `active` without modifying generated semantics.
- [ ] Generate and inspect the migration, apply it to clean development/test databases, and expose `GET`/`POST` from `toNextJsHandler(auth)`.
- [ ] Run the focused integration test; expect success.
- [ ] Commit: `git add package.json package-lock.json src/server/auth src/server/db/schema src/app/api/auth drizzle tests/integration/auth-config.test.ts && git commit -m "feat: add database owner authentication"`.

## Task 2: Add secure owner provisioning and MFA enrollment

**Files:**

- Create: `scripts/create-owner.ts`
- Create: `src/server/auth/provision-owner.ts`
- Create: `src/server/auth/policies.ts`
- Create: `src/server/auth/login-protection.ts`
- Modify: `package.json`
- Create: `src/app/admin/login/page.tsx`
- Create: `src/components/admin/LoginForm.tsx`
- Create: `src/app/admin/enroll-mfa/page.tsx`
- Create: `src/components/admin/MfaEnrollment.tsx`
- Test: `tests/integration/owner-provisioning.test.ts`
- Test: `tests/browser/admin-auth.spec.ts`

**Interfaces:**

- Produces `npm run owner:create`, an interactive TTY-only command.
- First login requires TOTP enrollment before access to business admin routes.
- Provisioning is idempotent by normalized email and never accepts a password as a CLI argument.

```ts
export type ProvisionOwnerInput = Readonly<{
  email: string;
  name: string;
  password: string;
}>;

export async function provisionOwner(
  input: ProvisionOwnerInput,
): Promise<'created' | 'exists'>;
```

- [ ] Write integration tests proving the first account is `OWNER`, rerunning does not duplicate it, a non-owner cannot provision, inactive accounts cannot authenticate, and five failed logins per combined account/IP HMAC subject trigger a 15-minute progressive delay without storing the raw email or IP.
- [ ] Write browser tests for generic bad-credential errors, successful first-factor login, forced enrollment, invalid TOTP, successful TOTP, and logout.
- [ ] Run both suites; expect failure because provisioning and pages do not exist.
- [ ] Implement a TTY prompt that masks password input, confirms it, enforces at least 14 characters, and passes it directly to the server provisioning function; reject non-interactive stdin rather than accepting environment/argument passwords.
- [ ] Apply login throttling before password verification and clear/decay counters after successful MFA-complete authentication; return a generic credential error before the threshold and `Retry-After` when throttled.
- [ ] Implement login and two-factor enrollment with Better Auth's client APIs for the installed version. Show backup codes once, require the owner to confirm safe storage, and never place TOTP secret/backup codes in URLs or logs.
- [ ] Enforce an `MFA_REQUIRED` policy for production and an `MFA_ENROLLMENT_REQUIRED` redirect for authenticated users lacking TOTP; the only permitted destinations before enrollment are enrollment and logout.
- [ ] Run the focused suites; expect success.
- [ ] Commit: `git add package.json scripts/create-owner.ts src/server/auth src/app/admin/login src/app/admin/enroll-mfa src/components/admin tests/integration/owner-provisioning.test.ts tests/browser/admin-auth.spec.ts && git commit -m "feat: provision owner with mfa enrollment"`.

## Task 3: Build the authorization DAL and protected admin shell

**Files:**

- Create: `src/server/auth/session.ts`
- Create: `src/server/auth/authorize.ts`
- Create: `src/server/auth/reauth.ts`
- Create: `src/server/security/origin.ts`
- Create: `src/server/security/csp.ts`
- Create: `src/proxy.ts`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/components/admin/AdminNav.tsx`
- Modify: `src/app/layout.tsx`
- Test: `tests/integration/admin-authorization.test.ts`
- Test: `tests/browser/admin-shell.spec.ts`

**Interfaces:**

- Produces `requireAdmin()`, `requireOwner()`, and `requireRecentReauthentication(maxAgeSeconds)`.
- Admin pages include `robots: { index: false, follow: false }` (`noindex, nofollow`) and no customer navigation.
- Dashboard reports order counts by actionable state, pending notification count, and recent orders without exposing data to unauthenticated requests.

```ts
export async function requireOwner(): Promise<AuthorizedActor> {
  const actor = await requireAdmin();
  if (actor.role !== 'OWNER') throw new AuthorizationError('FORBIDDEN');
  return actor;
}
```

- [ ] Add direct tests for no session, expired session, inactive admin, active admin, owner-only action, missing MFA, stale reauthentication, and forged/missing Origin on every cookie-authenticated mutation.
- [ ] Add a browser test proving unauthenticated `/admin` redirects to login and authenticated navigation includes Dashboard, Pedidos, Productos, and Categorías.
- [ ] Run focused tests; expect missing-DAL and route failures.
- [ ] Implement session lookup using `auth.api.getSession({ headers: await headers() })`; query current role/active state from the database on protected operations so disabling an account takes effect without trusting stale client data.
- [ ] Guard every admin page at the nearest server component and again inside each data loader/mutation. Use generic `notFound`/redirect behavior for unauthorized pages and typed `FORBIDDEN` responses for APIs.
- [ ] Reject cookie-authenticated mutations unless Origin matches the configured application origin. Add a nonce-based Content Security Policy and security headers through Next.js 16 `proxy.ts`; re-read the installed CSP/proxy guide and exclude static image/media bytes without weakening the admin policy.
- [ ] Add dashboard queries with explicit DTOs and no full customer phone/location in aggregate cards.
- [ ] Run focused tests; expect success.
- [ ] Commit: `git add src/server/auth src/server/security src/proxy.ts src/app/admin src/components/admin src/app/layout.tsx tests/integration/admin-authorization.test.ts tests/browser/admin-shell.spec.ts && git commit -m "feat: protect owner admin workspace"`.

## Task 4: Implement owner-only administrator management

**Files:**

- Create: `src/server/auth/admin-users.ts`
- Create: `src/app/admin/users/page.tsx`
- Create: `src/app/api/admin/users/route.ts`
- Create: `src/app/api/admin/users/[id]/route.ts`
- Create: `src/components/admin/AdminUserForm.tsx`
- Modify: `src/components/admin/AdminNav.tsx`
- Test: `tests/integration/admin-users.test.ts`
- Test: `tests/browser/admin-users.spec.ts`

**Interfaces:**

- Produces owner-only create, role-change, disable, and re-enable operations for `ADMIN` accounts.
- Requires recent reauthentication for every mutation and never returns password hashes, sessions, TOTP secrets, or backup codes.
- Prevents disabling/demoting the last active owner and prevents an owner from accidentally disabling their current session account.

```ts
export type AdminUserMutation =
  | { kind: 'CREATE'; email: string; name: string; role: 'ADMIN' }
  | { kind: 'SET_ACTIVE'; userId: string; active: boolean }
  | { kind: 'SET_ROLE'; userId: string; role: 'OWNER' | 'ADMIN' };
```

- [ ] Add integration tests for anonymous/admin denial, owner success, duplicate email, weak password, last-owner protection, self-disable protection, session revocation on disable, and audit events.
- [ ] Add browser tests proving the Users navigation is owner-only and that created admins must enroll TOTP on first login.
- [ ] Run focused suites; expect missing routes/use-case failures.
- [ ] Implement server-side Better Auth user creation with a generated one-time setup credential shown once to the owner; require the new admin to replace it and enroll MFA at first login.
- [ ] Implement role/active updates in a transaction, revoke affected sessions, and audit only actor ID, target ID, action, and safe before/after role/state.
- [ ] Run focused suites; expect success.
- [ ] Commit: `git add src/server/auth/admin-users.ts src/app/admin/users src/app/api/admin/users src/components/admin tests/integration/admin-users.test.ts tests/browser/admin-users.spec.ts && git commit -m "feat: manage admin users as owner"`.

## Task 5: Implement admin order operations

**Files:**

- Create: `src/server/orders/admin-list-orders.ts`
- Create: `src/server/orders/admin-get-order.ts`
- Create: `src/server/orders/update-order.ts`
- Create: `src/server/orders/quote-delivery.ts`
- Create: `src/app/admin/orders/page.tsx`
- Create: `src/app/admin/orders/[id]/page.tsx`
- Create: `src/app/api/admin/orders/route.ts`
- Create: `src/app/api/admin/orders/[id]/route.ts`
- Create: `src/app/api/admin/orders/[id]/status/route.ts`
- Create: `src/app/api/admin/orders/[id]/delivery-quote/route.ts`
- Create: `src/components/admin/OrderStatusForm.tsx`
- Create: `src/components/admin/DeliveryQuoteForm.tsx`
- Test: `tests/integration/admin-orders.test.ts`
- Test: `tests/browser/admin-orders.spec.ts`

**Interfaces:**

- Produces paginated/filterable owner order list and full order detail including phone and delivery location where operationally necessary.
- Produces allowed status transitions and delivery quote mutation. A quote sets `shippingMinor >= 0` and `totalMinor=subtotalMinor+shippingMinor` atomically.
- Every mutation writes an audit event with actor, entity, request ID, and before/after state but no copied PII.

```ts
export type DeliveryQuoteInput = Readonly<{
  orderId: string;
  shippingMinor: number;
  expectedUpdatedAt: string;
}>;
```

- [ ] Write integration tests for authorization, pagination with a hard maximum page size, filters, permitted/forbidden status edges, cancellation, exact delivery quote math, pickup quote rejection, concurrent stale update rejection, and audit creation.
- [ ] Add browser tests showing the owner receives phone and delivery location on the order detail page and can quote/advance an order with accessible confirmation feedback.
- [ ] Run focused suites; expect missing-use-case failures.
- [ ] Implement explicit admin order DTOs; full PII is allowed only on authenticated order detail, not list responses or aggregate logs.
- [ ] Use optimistic concurrency through `updatedAt` or a numeric version submitted by forms; return `409 STALE_ORDER` instead of overwriting a newer owner change.
- [ ] Require recent reauthentication for cancellation of a confirmed/preparing order and any manual correction that changes customer fulfillment data.
- [ ] Run focused suites; expect success.
- [ ] Commit: `git add src/server/orders src/app/admin/orders src/app/api/admin/orders src/components/admin tests/integration/admin-orders.test.ts tests/browser/admin-orders.spec.ts && git commit -m "feat: manage orders from protected admin"`.

## Task 6: Implement category and product administration

**Files:**

- Create: `src/server/products/admin-contracts.ts`
- Create: `src/server/products/admin-products.ts`
- Create: `src/server/products/admin-categories.ts`
- Create: `src/app/admin/products/page.tsx`
- Create: `src/app/admin/products/[id]/page.tsx`
- Create: `src/app/admin/categories/page.tsx`
- Create: `src/app/api/admin/products/route.ts`
- Create: `src/app/api/admin/products/[id]/route.ts`
- Create: `src/app/api/admin/products/[id]/duplicate/route.ts`
- Create: `src/app/api/admin/categories/route.ts`
- Create: `src/app/api/admin/categories/[id]/route.ts`
- Create: `src/components/admin/ProductForm.tsx`
- Create: `src/components/admin/CategoryForm.tsx`
- Test: `tests/integration/admin-catalog.test.ts`
- Test: `tests/browser/admin-catalog.spec.ts`

**Interfaces:**

- Produces paginated create/update/duplicate/activate/deactivate/reorder flows for products and categories with hard maximum page sizes.
- “Delete” is a soft delete; existing order snapshots remain readable.
- Catalog mutations invalidate the public catalog cache immediately.

```ts
export type AdminProductInput = Readonly<{
  categoryId: string;
  name: string;
  slug: string;
  priceMinor: number;
  stockQuantity: number | null;
  active: boolean;
}>;
```

- [ ] Add integration tests for owner/admin permissions, strict field validation, integer prices, optional stock, unique slugs, duplicate-product behavior, pagination limits, inactive-category product rejection, soft delete, historical order preservation, and cache invalidation.
- [ ] Add browser tests that create, edit, deactivate, and reorder a product and then observe the public catalog change without rebuild/redeploy.
- [ ] Run focused suites; expect missing routes/use cases.
- [ ] Implement Zod contracts and transactional application services. Do not bind database rows directly to form bodies; explicitly map permitted fields.
- [ ] Require recent reauthentication for destructive deactivation when it makes an active stocked item unavailable; show impact before confirmation.
- [ ] Run focused suites; expect success.
- [ ] Commit: `git add src/server/products src/app/admin/products src/app/admin/categories src/app/api/admin/products src/app/api/admin/categories src/components/admin tests/integration/admin-catalog.test.ts tests/browser/admin-catalog.spec.ts && git commit -m "feat: manage persistent catalog in admin"`.

## Task 7: Validate and store product uploads safely

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/server/storage/image-validation.ts`
- Create: `src/server/products/add-product-image.ts`
- Create: `src/app/api/admin/uploads/route.ts`
- Modify: `src/app/api/admin/products/[id]/route.ts`
- Modify: `src/components/admin/ProductForm.tsx`
- Test: `tests/unit/image-validation.test.ts`
- Test: `tests/integration/admin-images.test.ts`

**Interfaces:**

- Accepts JPEG, PNG, or WebP by decoded content, not filename/declared MIME alone.
- Maximum input is 8 MB and 24 megapixels; output is metadata-stripped WebP at bounded dimensions and quality.
- Storage keys are random UUID-based keys under `products/`; supplied filenames are display-only and not persisted.

```ts
const output = await sharp(input)
  .rotate()
  .resize({
    width: 2400,
    height: 2400,
    fit: 'inside',
    withoutEnlargement: true,
  })
  .webp({ quality: 82 })
  .toBuffer();
```

- [ ] Add fixture-driven tests for valid formats, MIME spoofing, SVG/polyglot rejection, decompression dimensions, oversized body, metadata stripping, randomized keys, authorization, and storage rollback when the DB insert fails.
- [ ] Run focused tests; expect missing validator/route failures.
- [ ] Run `npm install sharp` and commit its resolved native package lock entries.
- [ ] Stream multipart input with an enforced byte limit; require the extension and declared MIME to agree with the decoded JPEG/PNG/WebP format; then auto-rotate, resize inside a 2400×2400 box, and encode WebP with metadata excluded.
- [ ] Write the transformed object first, insert its metadata transactionally, and delete the just-written object if the database step fails. On image removal, soft-remove metadata first and queue object deletion after commit.
- [ ] Run focused tests; expect success. Manually confirm EXIF/GPS metadata is absent from an output fixture.
- [ ] Commit: `git add package.json package-lock.json src/server/storage/image-validation.ts src/server/products/add-product-image.ts src/app/api/admin/uploads src/app/api/admin/products src/components/admin/ProductForm.tsx tests/unit/image-validation.test.ts tests/integration/admin-images.test.ts && git commit -m "feat: secure admin product images"`.

## Task 8: Verify the complete admin boundary

**Files:**

- Modify only when a failing security or behavior proof identifies a defect.

**Interfaces:**

- Produces the protected operational baseline consumed by Plan 05.

- [ ] Run an authorization matrix against every `/api/admin/**` route as anonymous, inactive admin, active admin, and owner; expect no privilege bypass.
- [ ] Run `npm run format:check && npm run lint && npm run typecheck && npm test`; expect success.
- [ ] Run all PostgreSQL integration tests on a fresh migrated/seeded database; expect success.
- [ ] Run `npm run build && npm run test:e2e`; expect public and admin journeys to pass.
- [ ] Search captured logs and HTML for test passwords, session tokens, TOTP secrets, backup codes, full phones, and delivery locations outside authenticated order detail; expect no leaks.
- [ ] Verify `products/` is untouched and absent from staged/committed paths.
