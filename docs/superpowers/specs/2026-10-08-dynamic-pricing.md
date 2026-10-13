# Dynamic pricing and immutable verified payment

Date: 2026-10-08. Owner-approved pricing correction; implementation in progress. This policy supersedes any proposal to honor an unpaid request's original item prices in the commercial checkout specification. Do not commit or push this work without new explicit approval. No unrelated ticket work is authorized by this correction.

## Authority and reuse

Reuse the existing catalog, integer GTQ centavos, cart ID/quantity storage, order identity, idempotency, manual delivery quotes, receipt, version checks and PostgreSQL locks. No second cart or order store. The current catalog has no promotion records, open carts use the page's catalog snapshot, and order creation saves item and total snapshots that are currently reused for unpaid requests. These are gaps, not approved price-lock behavior.

The authoritative price for a cart or unpaid checkout is the current catalog price with the promotion valid at the server's evaluation time. Starting checkout, recovering a session, saving an unpaid order, accepting a total or obtaining a payment URL does not permanently lock a promotion. Price revisions preserve historical evidence; a historical revision is never authority to collect an expired amount.

## Promotion scheduling

A promotion needs a defined start, end and discount percentage. Owners schedule it in `America/Guatemala`; persisted instants and API timestamps are unambiguous. Start is inclusive and end is exclusive: at the end instant the discount no longer applies. A browser clock or a submitted discount/total is never authoritative.

Owner decision: support both the whole catalog and an explicit selection of one or more products. Promotions have a label, percentage, start/end and enable/disable toggle, managed through the existing protected admin dashboard. Disabled, future and expired promotions do not apply. Promotions never stack: choose the highest valid percentage for each product. Equal discounts use a stable promotion identity for deterministic attribution, without changing the amount.

Arithmetic uses integer centavos and integer basis points (percentage precision up to two decimal places). Round each discounted sale-unit price to the nearest centavo, half up, then multiply by quantity; this preserves the existing exact unit-price × quantity invariant. Original/base prices remain intact in the catalog. The storefront shows original and discounted prices and the winning promotion label. No grace period or default promotion is seeded.

## Cart and unpaid checkout

- Persist only product IDs and quantities in the cart; fetch current authoritative pricing when the cart is opened/refreshed, returns to the foreground, reaches a known promotion boundary, and before checkout acceptance/payment eligibility.
- An open unpaid checkout automatically loses an expired discount. Reads and mutations must evaluate current pricing, so correctness never depends on a background expiry job having run. If refresh fails, label pricing unavailable and block continuation rather than presenting stale values as approved.
- Revalidate product availability, quantities, base prices, active promotion, fulfillment, delivery quote and complete GTQ total on the backend. An unavailable/deleted product blocks checkout rather than disappearing silently from an accepted order.
- Use versioned current pricing revisions bound to quantities, catalog/promotion versions, delivery quote, date and final amount. Any change invalidates prior acceptance, displays the updated lines and total, and requires explicit customer acceptance. No client may accept a different revision implicitly.
- Same logical request remains the same order after reload, expiration or retries. Idempotency is identity and duplicate prevention, not permission to replay expired prices. Preserve existing request-hash conflict behavior while returning/reviewing the current unpaid pricing revision.
- Pickup includes its complete amount; delivery remains nonpayable until its current delivery charge is known and the customer accepts the complete total. Repricing item amounts does not invent a delivery tariff.

## Payment validity and immutability

Payments remain disabled while Ticket 01 is **BLOCKED — external provider verification required**. There is no verified-payment adapter or payment-link route today; no fake success or fake production payment endpoint will be added to satisfy tests.

The required provider policy is strict bounded validity: a promotional payment must successfully occur within the valid promotion interval, under the exact customer-accepted revision. Merely initiating payment before expiry does not preserve the discount. The provider must enforce the effective deadline and prove terminal non-payability afterward, including in-flight methods. Until Ticket 01 verifies these capabilities and authoritative success timestamps for each method, promotional payment links cannot be enabled. A local timer, redirect or webhook arrival time cannot establish that policy.

Immediately before creating any future payment attempt, the server revalidates the current price, quantities, promotion validity and full accepted total under the shared lock/version protocol. Save an immutable attempt amount/revision and bounded validity before the external call; recheck after it returns before exposing a link. Never expose a stale attempt. No provider HTTP call occurs inside a database transaction. Concurrent price/quote edits, promotion expiry and attempt creation cannot produce a payable stale revision. An unresolved attempt blocks replacement collection until the provider proves the old one cannot collect.

Verified successful payment atomically records the exact gross amount, GTQ, quantities, item base and discounted prices, discount and promotion identity/window, delivery amount, accepted revision, immutable provider association and authoritative success time. This paid pricing snapshot is permanent. Later catalog changes, promotions, delivery requotes, refunds or status transitions cannot rewrite it; refunds are separate financial records. A delayed webhook for a success that actually occurred within the valid window preserves the valid paid amount. A success outside the valid policy or for a mismatched amount is a financial exception requiring reconciliation, never silent acceptance, disappearance of collected funds, or an automatic unexpected supplemental charge.

Do not relabel an existing `PAID` flag as verified provider evidence. Existing paid/refunded markers must be protected from pricing edits; creating new verified paid records remains blocked on the real integration.

## Required evidence

| Layer                        | Cases and expected result                                                                                                                                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                         | Q100 with 70% discount gives Q30 and five units Q150; inactive/expired promotion yields Q500; inclusive start/exclusive end; Guatemala schedule conversion; approved rounding and invalid percentage/window rules.                                                |
| Integration                  | Current catalog/promotion reads, unpaid revision refresh after expiry, stale acceptance conflict, changed quantities, concurrent price/expiry/acceptance requests, exactly one logical order, and paid pricing immutability through catalog and delivery changes. |
| Browser                      | Open/reloaded/foreground cart and saved unpaid checkout change Q150 to Q500 at expiry; updated total requires explicit acceptance; failed refresh cannot continue; a valid paid receipt remains Q150.                                                             |
| Payment application fixtures | Authoritative success before expiry with delayed notification freezes Q150; success after expiry, stale amount, duplicate event and concurrent verification cannot bypass validity or mutate paid lines. These tests prove application behavior only.             |
| Provider contract            | Real method-specific expiry, in-flight termination, canonical success time, old-link rejection and delayed notification evidence. Blocked under Ticket 01; fixtures do not substitute for it.                                                                     |

Implementation evidence is recorded in `docs/implementation/2026-10-07-checkout-progress.md`. The provider-independent Ticket02 implementation does not establish verified-payment processing or provider expiry guarantees; payment-dependent acceptance remains blocked.

## Current implementation scope

Complete and test Ticket 02's provider-independent promotion, cart refresh, unpaid checkout review and explicit acceptance behavior before starting another ticket. Reuse MFA/role checks, trusted Origin, version conflicts and audit records for promotion administration. Keep collection disabled; pre-payment revalidation is a mandatory contract for the future real adapter, never a simulated payment route. Payment-verification and old-link terminality remain external gates under Ticket 01 and cannot be marked complete by application fixtures.

## Persistence and concurrency details

Unpaid pricing revisions are append-only JSON snapshots attached to the existing order. A separate current/accepted reference records customer approval; creation snapshots in `order_items` are retained. Receipt, recovery and admin detail project the current unpaid revision, while paid/refunded orders continue to use their saved revision (or untouched legacy snapshot). A catalog mutation lock precedes the order row and sorted product locks; pricing reads the clock after waits. Stock remains allocated exactly once by existing order creation. New revisions invalidate approval, including equal-total changes to promotion identity or the delivery quote. Acceptance also rechecks the existing two-day ordering rule and availability. No capacity policy is introduced here.
