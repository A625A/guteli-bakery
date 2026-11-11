# Manual ordering workflow implementation plan

**Goal:** Finish customer payment choice, owner payment evidence, customer-initiated WhatsApp and durable backup email within the existing application.

**Specification:** User's final five-phase request supplied on 2026-11-08. No commercial activation, external sends, deployment, production migration or production data changes are authorized.

**Architecture:** Keep checkout credentials, idempotency, price revisions, owner/MFA authorization, PostgreSQL row locks and transactional outbox. Add append-only manual payment events. Bind customer acknowledgment of a changed method to the existing price revision acceptance. Email uses a separate outbox event and a bounded Netlify scheduled function; Meta code stays disabled.

**Approaches:** Extend the current modules (chosen implementation judgment; preserves all existing controls). Replacing checkout or adding a gateway conflicts with the requested scope. A persistent mail worker conflicts with Netlify's runtime, so use scheduled invocations.

## Constraints and review focus

- Three methods only; selection is mandatory and server validates fulfillment compatibility.
- A selected method and a legacy PAID marker are not verification evidence.
- Confirm funds/cash explicitly; exact GTQ total and accepted current revision are required. Bank verification requires received bank funds, never a screenshot. Cash is collected at handover.
- Method changes invalidate acceptance, and the customer sees and explicitly acknowledges the method with the total.
- Paid cancellation leaves payment evidence intact and exposes a refund obligation; only a separately attested full manual refund records REFUNDED. Partial/refund exception automation is outside scope.
- No real bank details are published; drafts remain owner-private.
- Network failures, expired leases and retries must never recreate an order or duplicate an accepted email after the provider's dedupe window.
- Unrelated pre-existing work remains untouched; no commit, push or deployment.

## Tasks

- [x] 1. Payment selection: failing contract tests; compatible choices and fulfillment reset; persist/hash/serialize method; checkout recovery and response DTO. Run contract and order tests.
- [x] 2. Payment verification: failing transaction tests; schema/migration for unique payment/refund events, owner-only endpoints, MFA/version/revision checks, attestation, safe audit and idempotency. Run PostgreSQL tests including competing writers and rollback.
- [x] 3. Owner/customer UI: show selected/acknowledged method and verified evidence; owner confirmation forms; paid cancellation/refund boundary and history. Verify owner access and private status labels.
- [x] 4. WhatsApp: parallel isolated module work; fresh server snapshot, primary one-click action, no contact/address/notes in URL, copy/manual/retry fallback. Run summary and browser checks.
- [x] 5. Email: parallel isolated module work; official provider research, immutable idempotent outbox request, disabled configuration gates, scheduled Netlify delivery, safe failures visible in admin. Run provider/queue tests with fake transport.
- [x] 6. Integrate and verify: typecheck, lint, focused format, complete unit/integration suites, representative mobile/admin browser journeys and build. Document business inputs and external activation procedure.

## Progress

- Baseline main: 3d6af97. Pre-existing next-env.d.ts change and untracked owner-review/products/audit files preserved.
- Local instructions and relevant bundled Next route/server-client documentation read before edits.
- Implementation is authorized by the detailed user specification; internal design choices proceed without a new approval cycle. Changes remain uncommitted for review.
- Review correction: customer acknowledgment now remains valid on collection day when its exact revision is unchanged; both cash methods have RED→GREEN PostgreSQL regressions. Ordering lead time is not reapplied to confirmed orders that need a final quote acknowledgment.
- Private-link access: the existing random receipt capability can authorize review/acceptance/summary via an internal request header after the 24-hour recovery cookie expires. It is matched to the exact order and non-anonymized row under lock, with Origin checks for mutation. An invalid supplied token never falls back to a cookie, and a newer unrelated cookie cannot select another order. The cookie/idempotency recovery window is unchanged; the link grants no owner/payment authority. This avoids making late delivery quotes impossible to accept.

- Final verification: 405 unit tests, 216 PostgreSQL integration tests, 18 live browser cases, four complementary browser cases, 32 existing browser regressions, TypeScript, ESLint, Next build with fictitious configuration, and independent Netlify function bundle passed. Details and external inputs: `docs/implementation/2026-11-09-manual-order-workflow.md`.
