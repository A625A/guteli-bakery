# 05: Confirm only a verified matching payment

**Priority:** P0
**Status:** draft — awaiting owner approval; not authorized for implementation.

**What to build:** A matching provider-confirmed collection confirms the matching order, even when the customer never returns.

**Scope:** Authenticated durable webhook inbox, authoritative status retrieval and one financial/order transaction. Include reconciliation for missed events; no arbitrary admin paid toggle.

**Blocked by:** 04.

## Acceptance criteria

- [ ] Verify authoritative success time against promotion/attempt validity, not webhook arrival time. Valid Q150 payment remains Q150 after expiry; success outside validity or for an unexpected amount is an explicit financial exception.
- [ ] Atomically freeze the exact paid amount, currency and item-level base/discount/quantity/promotion snapshots. Catalog changes, new promotions, delivery edits, refunds and duplicate/concurrent events never rewrite paid pricing. Test with application fixtures while keeping actual provider verification separately blocked.

- [ ] Verify raw bounded request bytes with official Svix headers, timestamp tolerance and configured signing key; persist before acknowledging.
- [ ] Dedupe delivery IDs separately from canonical financial identities; early event before checkout mapping remains recoverable.
- [ ] Server retrieves and compares merchant/environment, checkout/intent association, immutable reference, gross amount and GTQ; mismatches are quarantined.
- [ ] Matching success atomically records verified payment, confirms the order and makes owner acknowledgement due exactly once.
- [ ] Duplicate or late pending/failed events never downgrade success; an actual extra charge is recorded as an exception rather than ignored.
- [ ] Existing unpaid manual requests remain distinct; no client-controlled or unrestricted owner-controlled payment transition.
- [ ] Restartable bounded reconciliation recovers missed/failed processing and exposes unresolved age/heartbeat.

## Tests and evidence

Invalid signature/raw-body alteration/stale timestamp, duplicate delivery, different delivery same intent, wrong amount/currency/reference/environment, early webhook, commit failure, double processor, crash recovery and no-browser-return; real isolated DB concurrency and signed Sandbox fixtures.

## Completion boundary

Demonstrate the stated behavior and record evidence. Do not commit, push, deploy, purchase, send messages, modify production data or run real-money transactions without the authorization applicable at implementation time.
