# Task 3 — protected owner admin workspace report

## Scope and installed guidance

- Worktree: `feat/backend-admin-orders` at base `ebcd4003e32b46e702d15aa0d1a5261827b593ec`.
- Read the repository `AGENTS.md`, Plan 04, the Task 3 brief/ledger, Task 2 report and authoritative auth implementation.
- Read the installed Next 16.3.3 authorization/DAL, CSP nonce, proxy, route-group, and async request-header guidance before changing App Router code.
- Database-backed verification used only the guarded `guteli_test` database through `DATABASE_URL_TEST`.

## RED evidence

The first focused tests were written before production implementation and failed for the intended missing boundaries:

```text
tests/unit/admin-security.test.ts
FAIL Cannot find module '@/proxy'

tests/unit/admin-authorization-policy.test.ts
FAIL Cannot find module '@/server/auth/authorize'

tests/integration/admin-authorization.test.ts
FAIL Cannot find module '@/server/admin/dashboard'

tests/browser/admin-shell.spec.ts
FAIL verified admin shell/navigation was absent
```

Further fail-first regressions exposed and fixed four concrete defects:

- pickup/delivery notification aggregates counted unrelated pending outbox work (`expected 1, received 2`);
- the initial nonce-only development style policy triggered CSP console violations in the Next development runtime;
- moving storefront pages into a route group removed the public shell from the unmatched-route 404;
- the generic static-extension matcher also exempted protected paths such as `/api/admin/uploads/file.png`.

The full browser suite also revealed two environment/runtime gaps before final GREEN:

- Docker `RUN npm run build` failed while collecting `/api/auth/[...all]` because the builder lacked required production validation values;
- the existing real MFA lifecycle could reuse the enrollment TOTP within the same 30-second step and fail nondeterministically on its second login.

## Implementation

- Made the root layout neutral and moved the unchanged storefront pages into `(storefront)`, with a shared async storefront shell preserving URLs, visuals, cart hydration, header/footer, and the public 404.
- Added a request-time admin layout and navigation with no storefront chrome, plus private/no-store, noindex/nofollow, and no-referrer defenses.
- Reused Task 2's authoritative database-backed session resolver. `requireAdmin()` and `requireOwner()` reload and enforce current role, active/setup state, MFA completeness, expiry, and revocation behavior rather than trusting browser data.
- Added exact recent reauthentication enforcement using the server-side `mfaVerifiedAt` completion marker: exactly 600 seconds is accepted, 600.001 seconds and future/client-forged time are rejected, and callers cannot request more than 10 minutes.
- Added fail-closed serialized-Origin validation for cookie-authenticated admin mutations while leaving public unauthenticated order creation outside that rule.
- Added a per-request CSP nonce and correct request-header forwarding with `NextResponse.next({ request: { headers } })`. Production has no unsafe CSP directives; development permits only the inline styles and eval required by the Next development runtime. Explicit `/admin/:path*` and `/api/admin/:path*` matchers prevent static-looking protected paths from bypassing the proxy, while Next static/image and public media bytes remain excluded.
- Added a minimized dashboard DAL with actionable order counts, only `OWNER_ORDER_CREATED` pending notification count, and ten recent orders containing no customer name, full phone, delivery location, notes, auth secrets, or session material.
- Added builder-only synthetic environment validation values so the production Docker image can compile. The final runner stage does not inherit those values and still requires runtime configuration.
- Seeded an independent ADMIN browser fixture through Better Auth's installed password hasher and credential conventions. Stabilized the existing lifecycle test by waiting for a fresh TOTP before its second sign-in.

## GREEN and final verification

Focused tests:

```text
npm test -- tests/unit/admin-security.test.ts
Tests  5 passed (5)

DATABASE_URL_TEST=[guteli_test] npm run test:integration -- tests/integration/admin-authorization.test.ts
Tests  4 passed (4)

DATABASE_URL_TEST=[guteli_test] npx playwright test tests/browser/admin-shell.spec.ts --workers=1
3 passed

DATABASE_URL_TEST=[guteli_test] npx playwright test tests/browser/admin-auth.spec.ts --workers=1
4 passed

DATABASE_URL_TEST=[guteli_test] npx playwright test tests/browser/order-persistence.spec.ts --workers=1
1 passed, including app-container restart
```

Full gates:

```text
npm test
Test Files  25 passed (25)
Tests  168 passed (168)

DATABASE_URL_TEST=[guteli_test] npm run test:integration
Test Files  13 passed (13)
Tests  83 passed (83)

DATABASE_URL_TEST=[guteli_test] npx playwright test --workers=1
92 passed (92)

npm run typecheck
Generating route types... passed

npm run lint
eslint . --max-warnings=0 passed

DATABASE_URL=[guteli_test] BETTER_AUTH_SECRET=[REDACTED_SECRET] BETTER_AUTH_URL=http://127.0.0.1:3000 RATE_LIMIT_SECRET=[REDACTED_SECRET] RECEIPT_TOKEN_SECRET=[REDACTED_SECRET] TRUSTED_PROXY_HOPS=1 npm run build
Next.js 16.3.3 compiled, typechecked, collected, and emitted all routes successfully
```

Scoped Prettier completed with every Task 3 source/test unchanged. `git diff --cached --check` passed. The final source scan found no logging of customer PII, passwords, TOTP secrets, backup codes, cookies, or session tokens; test-only credentials remain obvious synthetic fixtures.

## APFS recovery and cleanup

APFS offloaded `src/test/setup.ts`, worktree `HEAD`, `CLAUDE.md`, `AI/AI-EOS/09_GIT_WORKFLOW.md`, the original Vitest config inode, generated `.next` cache files, and 162 dependency files. Each tracked file was recovered byte-exact from the index/private GitHub commit or an identical resident copy and hash-verified; original placeholders were preserved under worktree metadata. `node_modules` was rebuilt from `package-lock.json` with offline `npm ci`, and the generated old `.next` cache was preserved outside the visible worktree. No main-checkout `products/` file or non-test database was touched.

Generated `next-env.d.ts` and six Playwright screenshots were restored and are not part of this task. The tracked Task 3 status is clean after the exact commit below; no push, merge, or amend was performed.
