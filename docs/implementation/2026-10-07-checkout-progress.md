# Checkout implementation record

Execution update: 2026-10-08, America/Guatemala.

Ticket 01 is blocked on external provider verification: the owner has no Recurrente account. It is not complete. Ticket 02 and independent Ticket 10 preparation are authorized; Ticket 03 awaits its dependencies and approved capacity rules. Commit/push of scoped verified milestones is authorized. Public deployment, account creation, paid resources and real payments remain excluded.

## First slice: recover a submitted order

Reuse the existing order idempotency record and receipt instead of creating another order store. Establish a scoped signed HttpOnly checkout credential before sending customer data. A reload or lost submission response can look up the original request using the same key, without storing customer information in browser storage. A recovered request is still unpaid and unconfirmed for production.

The approved ticket/specification supplies the test interfaces: customer HTTP routes and browser journey, backed by isolated PostgreSQL. TDD tests use these existing interfaces and observable responses; no extra test-interface approval is needed under the user's instruction to proceed with documented decisions.

Credential lifetime initially follows the existing 24-hour idempotency window. This is recovery authorization only, not a delivery-quote validity period, capacity reservation or payment expiry. Missing/expired credentials never disclose an order or silently claim recovery. Final-total acceptance remains a separate slice; this first milestone cannot complete Ticket 02.

## Recovery boundaries

One active checkout is shared by tabs in the same browser profile. Web Locks serialize credential issuance and a readback verifies that the browser retained the HttpOnly cookie before sending customer details. Browsers without this coordination capability fail safely before order submission. An explicit new-order action is allowed only after the current order is found and matches the order displayed to the customer; unresolved submissions keep their original key. A mounted form retains its submitted server key and stops if another tab has replaced the active checkout. Reload recovers the minimal receipt without another order submission; retry from the form still uses the existing server request-hash check, so changed details conflict rather than silently opening an older order.

The signed credential is domain-separated from receipt tokens and authorizes only recovery of a minimal receipt in this milestone. It does not yet authorize a private customer summary or total acceptance. No customer name, phone, address or notes are persisted in browser storage.

## Independent Ticket 10 safeguard

The server environment schema rejects `PAYMENTS_ENABLED=true` while no verified provider adapter exists. Default request-only mode remains available. This is a configuration safeguard, not completion of production readiness or provider verification.

## Verification and review

- Unit suite: 29 files, 226 tests passed.
- Isolated PostgreSQL API tests: `checkout-session.test.ts`, `order-api.test.ts`, `receipt-api.test.ts`; 23 tests passed.
- Checkout browser suite: all 26 tests passed in the final run, including lost-response recovery, blocked cookies, initial cross-tab race, edited retry, stale-tab retry, and existing checkout behavior.
- ESLint, TypeScript, Prettier and production Next build passed. Build used disposable audit settings; no production deployment or real provider connection occurred.
- Independent standards review is clear. Specification review identified missing cookie retention verification, simultaneous issuance, changed-body handling and stale-tab rotation; each was reproduced and corrected with regression coverage. The main agent reviewed the final stale-tab guard and expected-order check.
- Existing `products/` files and both worktrees were preserved. Backend notification WIP remains 18 tracked changed files (379 insertions, 33 deletions), plus its preexisting untracked additions. GitHub's three README-only commits were fast-forwarded before publication.

## Next business decision

Before implementing final-total acceptance, establish whether a previously submitted order keeps its original item prices when the catalog changes, or must be repriced before customer approval. The current order implementation preserves item snapshots; either policy must keep historical records unchanged and require explicit acceptance of the final delivery charge. Ticket 03 still needs the owner's capacity measure, limits and date rules. Neither Ticket 02 nor Ticket 10 is complete.

## Owner correction — dynamic pricing

The owner has answered the pricing question: carts and unpaid orders reprice dynamically, including scheduled percentage promotions; only successfully verified payments freeze pricing permanently. The [2026-10-08 pricing specification](../superpowers/specs/2026-10-08-dynamic-pricing.md) supersedes the earlier recommendation. Related specification/ticket changes precede implementation. The latest instruction **withdraws commit/push authorization for new work** and excludes unrelated tickets; the previous published milestone remains unchanged. Ticket 01 stays blocked and payments remain disabled.

### First correction slice: protect already-paid pricing

Inspection found that the existing owner delivery-quote endpoint could overwrite totals on a paid order. Added a payment-status check inside its existing order row lock and a safe `409 PAID_PRICING_IMMUTABLE` response for `PAID` and `REFUNDED`. The admin page omits that pricing action for those states. Catalog changes still leave saved paid item amounts unchanged.

TDD evidence: the two paid/refunded API regressions first returned 200 instead of 409; after the fix all 12 admin-order integration tests pass, including a two-connection race where payment status changes while the quote waits for the lock. The browser test first found the prohibited quote button; after the UI change the full owner-order journey passes, including unchanged paid totals after a catalog price increase. These are synthetic persisted-state fixtures, not actual provider verification. The browser fixture restores catalog prices in `finally`.

Relevant unit tests: 14 passed (server environment, order state, admin authorization policy). ESLint, TypeScript and formatting of changed files pass. The repository-wide formatter flags the unchanged README imported in the prior milestone; it remains untouched. Independent spec and standards reviews have no remaining findings in this bounded slice.

Promotions, live unpaid repricing and final-total acceptance are not implemented by this guard. Promotion-scope selection is the next owner decision before the promotion data model. No commits, pushes, migrations or real payments were performed for this correction.

### Promotion-scope decision

The owner approved both selected-product (one or multiple) and catalog-wide promotions, percentage/start/end/enable controls in the protected dashboard, storefront labels/original/discounted prices, Guatemala scheduling, automatic expiry, and highest-valid-discount selection without stacking. Continue Ticket 02 only; do not start another ticket, commit or push. Payments remain disabled under blocked Ticket 01. The specification and acceptance criteria were updated before this implementation phase.

### Ticket02 provider-independent pricing milestone — 2026-10-08

Implemented both promotion scopes, percentage/start/end/enabled controls in protected administration, Guatemala scheduling and highest-valid-discount selection. Storefront and carts show original/discounted prices and labels. Live refresh runs at server-reported boundaries, on foreground and periodically; failure disables continuation, and unavailable items require explicit removal without erasing form data.

Unpaid creation/replay/recovery/receipt/admin reads resolve current pricing. Append-only pricing revisions retain original creation snapshots; an owner-cookie protected endpoint explicitly accepts the current complete total. Shared receipt tokens cannot accept it. Repricing, equal-total promotion changes and delivery requotes invalidate approval. Catalog → order → product locks serialize changes, and authoritative time is read after waits. Stock is allocated only once. PAID/REFUNDED records retain their stored prices. Pending payment markers block acceptance while still displaying current unpaid prices.

Migrations0009–0011 were generated and tested only in the isolated local PostgreSQL database. No production migration, commit, push, public deployment, paid resource, external message or payment occurred. Ticket01 remains **BLOCKED — external provider verification required**. Provider success-time verification, payment-link terminality and immutable verified provider records remain gates under01/04/05; synthetic paid markers do not prove provider behavior.

Verification:

- 224 unit tests passed; the unchanged `docker-runtime.test.ts` file was excluded in the focused successful run because two README assertions fail on the existing README. The earlier full run also hit local socket sandbox restrictions; those socket tests pass with local test permission. README and its tests were not changed.
- 78 distinct integration tests passed across the targeted nine-file suite and the order/receipt/delivery contract suite (overlapping admin tests counted once). The final pricing/owner-session rerun passed all9 tests after review fixes.
- 44 storefront/browser cases and the separate final admin-order case passed (45 distinct cases). New browser evidence covers Q150→Q500 expiry in open carts, saved owned checkouts and shared receipts; renewed acceptance; unavailable refresh; preserved form data; protected promotion management and unchanged paid totals. An old admin fixture expectation was corrected from its unpaid historical Q75 to the current Q180 before the final admin run passed.
- TypeScript, ESLint, scoped Prettier checks and a local production Next build pass. Build used disposable placeholders and payments disabled.
- Independent reviews identified stale storefront display, form unmount on unavailable products, and missing expiry timing on shared receipts. These were corrected and browser-tested. The full independent review could not finish because its agent hit a usage limit; final local review was performed, without claiming independent sign-off.

A small local harness and checkpoint under `.scratch/production-readiness/` keep full test logs at `/private/tmp/guteli-ticket02-harness/`, reducing repeated context reads. Existing products/ assets and other worktrees remain untouched. No unrelated ticket was started. Ticket02's provider-independent scope is implemented; payment-dependent acceptance criteria remain unchecked.

### Owner decision — skip Ticket03 (2026-10-08)

The owner declined automated production capacity because orders are scheduled and current volume does not require it. Ticket03 is skipped, not completed; no capacity code or migration was implemented. Updated the specification precedence note, glossary, dependency plan and affected payment tickets. Existing requested-date scheduling, advance-date validation, availability and finite stock remain. Payment-expiry and promotion-validity safeguards still apply, and Ticket01 stays blocked. This was a documentation-only update; no application tests, commits, pushes or deployments were needed or performed.
