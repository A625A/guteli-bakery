# 02: Review and recover one authoritative checkout

**Priority:** P0
**Status:** IN PROGRESS — provider-independent implementation verified; provider-dependent criteria remain open. Payment-dependent acceptance remains blocked under 01/04/05; actual payments remain disabled.

**What to build:** A customer reviews a complete server-priced total and resumes the same logical order after reload or a lost response.

**Scope:** Reuse existing cart, order creation, manual delivery quote and minimal receipt. Do not add payments or maps in this slice.

**Blocked by:** Provider-independent implementation is authorized with both promotion scopes and highest-valid-discount selection. Payment-dependent evidence remains gated by Ticket 01. See the [pricing correction](../../../docs/superpowers/specs/2026-10-08-dynamic-pricing.md).

## Acceptance criteria

- [x] Pickup has a full GTQ total; delivery stays nonpayable until owner quote and explicit customer acceptance of the final total.
- [x] Any changed price, address, quote or date invalidates the prior acceptance and requests re-review; historical snapshots remain unchanged.
- [x] A secure scoped checkout-owner credential recovers the same order/attempt across reload without browser persistence of customer PII (first slice: minimal receipt recovery within the existing 24-hour window).
- [x] Stable logical idempotency survives dropped responses; changed content under the same key conflicts. Existing requests migrate only through explicit review.
- [x] Public receipt remains PII-free; unauthorized recovery fails generically; loading/error/retry retains cart and form.
- [x] Scheduled percentage promotions use explicit start/end in America/Guatemala; active pricing is evaluated server-side with an exclusive end boundary.
- [x] Existing protected administration creates/edits/enables/disables catalog-wide or one/multiple-product promotions with MFA/role, Origin, version and audit protection.
- [x] Promotions never stack; the highest valid discount wins per product. Storefront shows original price, discounted price and promotion label.
- [x] Carts and unpaid orders always resolve current catalog/promotional pricing; starting checkout, saving an unpaid order or replaying idempotency cannot lock an expired discount.
- [x] Open/reloaded/foreground carts and saved checkouts refresh automatically at promotion expiry. Unavailable refresh blocks continuation safely.
- [ ] Current quantities, product availability, prices, promotion and full delivery-inclusive total are revalidated before acceptance and every future payment initiation; stale revisions require explicit reacceptance.
- [ ] Paid/refunded pricing cannot be changed by catalog updates or delivery requotes. The future verified payment record permanently retains the exact paid amount and item-level pricing evidence.
- [ ] Q100 at 70% discount × 5 resolves Q150 during validity and Q500 when unpaid after expiry; a valid verified Q150 payment permanently remains Q150.
- [ ] Unit, isolated integration and browser tests cover expiration, refresh, stale sessions, concurrent requests and immutable paid totals. Verified-payment fixtures and real expiry contracts remain distinct evidence under 01/04/05.

## Tests and evidence

Unit amount/hash/date cases; isolated DB idempotency replay/conflict; browser lost-success-response then reload, cross-order recovery denial, quote change and full total review.

Initial recovery milestone evidence: [implementation record](../../../docs/implementation/2026-10-07-checkout-progress.md). Customer-approved final totals and price/quote invalidation are implemented in the current uncommitted slice; provider-dependent requirements are not completed.

The owner's pricing correction withholds commit/push approval for the new work. Payments remain disabled; no unrelated ticket implementation.

## Completion boundary

Demonstrate the stated behavior and record evidence. Do not commit, push, deploy, purchase, send messages, modify production data or run real-money transactions without the authorization applicable at implementation time.

## Provider-independent milestone

Both promotion scopes, Guatemala scheduling, highest-discount selection, protected admin management, live storefront/cart refresh, same-order repricing, owner-only acceptance, quote invalidation and paid/refunded preservation are implemented. Creation snapshots and pricing revision history remain unchanged. Shared receipts refresh at the promotion boundary but cannot accept totals without the owner credential. Unavailable products remain visible for explicit removal and do not erase the checkout form.

Future payment initiation and verified success records still require Tickets01/04/05. There is no payment endpoint, provider adapter, paid resource or public deployment in this work.
