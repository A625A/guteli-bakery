# Ticket02 checkpoint

Current: provider-independent implementation verified. Ticket01 BLOCKED. Payments disabled. No commit/push/deploy authorization; none performed. Do not start other tickets.

Implemented: both promotion scopes, admin controls, Guatemala scheduling, highest discount, storefront labels, expiry refresh; immutable pricing revisions; current unpaid creation/replay/recovery/receipt/admin reads; owner-only acceptance and quote invalidation; paid/refunded preservation. Migrations0009–0011 applied only to temporary tests.

Verified: 224 unit, 78 distinct integration, 45 distinct browser tests; TypeScript, lint, scoped formatting, production build. Two unchanged README assertions fail in the full unit suite; focused successful unit run excludes docker-runtime.test.ts. Review fixes are tested; independent review was incomplete due usage limit.

Harness: python3 .scratch/production-readiness/verify-ticket02.py <profile>. Profiles: unit, integration, contracts, pricing, browser, admin-browser, types, lint, build. Full logs: /private/tmp/guteli-ticket02-harness. DB profiles require DATABASE_URL_TEST. Never run browser and DB integration concurrently.

Temporary DB cluster: /private/tmp/guteli-checkout-audit-pg, port55439/guteli_test. Stopped after final checks. Preserve products/ and all worktrees. Evidence: docs/implementation/2026-10-07-checkout-progress.md. Remaining external provider contracts belong to01/04/05 and are not completed by fixtures.
