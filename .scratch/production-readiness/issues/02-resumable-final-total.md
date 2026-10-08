# 02: Review and recover one authoritative checkout

**Priority:** P0
**Status:** IN PROGRESS — implementation authorized; actual payments remain disabled.

**What to build:** A customer reviews a complete server-priced total and resumes the same logical order after reload or a lost response.

**Scope:** Reuse existing cart, order creation, manual delivery quote and minimal receipt. Do not add payments or maps in this slice.

**Blocked by:** None; fulfillment, prices and customer recovery policy require owner approval.

## Acceptance criteria

- [ ] Pickup has a full GTQ total; delivery stays nonpayable until owner quote and explicit customer acceptance of the final total.
- [ ] Any changed price, address, quote or date invalidates the prior acceptance and requests re-review; historical snapshots remain unchanged.
- [x] A secure scoped checkout-owner credential recovers the same order/attempt across reload without browser persistence of customer PII (first slice: minimal receipt recovery within the existing 24-hour window).
- [ ] Stable logical idempotency survives dropped responses; changed content under the same key conflicts. Existing requests migrate only through explicit review.
- [ ] Public receipt remains PII-free; unauthorized recovery fails generically; loading/error/retry retains cart and form.

## Tests and evidence

Unit amount/hash/date cases; isolated DB idempotency replay/conflict; browser lost-success-response then reload, cross-order recovery denial, quote change and full total review.

Initial recovery milestone evidence: [implementation record](../../../docs/implementation/2026-10-07-checkout-progress.md). Customer-approved final totals and price/quote invalidation are still pending; this ticket is not completed.

## Completion boundary

Demonstrate the stated behavior and record evidence. Do not commit, push, deploy, purchase, send messages, modify production data or run real-money transactions without the authorization applicable at implementation time.
