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
