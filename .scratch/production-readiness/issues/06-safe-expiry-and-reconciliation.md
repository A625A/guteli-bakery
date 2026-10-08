# 06: Release abandoned capacity only when safe

**Priority:** P0
**Status:** draft — awaiting owner approval; not authorized for implementation.

**What to build:** Abandoned nonpayable checkouts eventually return capacity, while unresolved transfers keep their slot protected.

**Scope:** Durable expiry/reconciliation jobs, leases, heartbeat and owner exception view; no automatic release based solely on local time.

**Blocked by:** 01, 05; approved waiting/escalation policy.

## Acceptance criteria

- [ ] At display expiry remove payment action, retrieve provider truth and expire/invalidate only where supported.
- [ ] Pending/unknown creation or payment continues consuming capacity; alerts explain why and show age.
- [ ] Release requires documented and tested terminal non-payability; if method cannot provide it, automatic release remains disabled for that method.
- [ ] Release/decrement counters and any uncommitted finite-stock restoration happen once in the shared transaction/lock protocol.
- [ ] Worker restarts and competing workers recover leases without duplicate release; provider outage defaults to retaining holds.
- [ ] Late success never overbooks or disappears; create financial exception and require owner resolution. Its occurrence is evidence to revisit the release contract.

## Tests and evidence

Frozen-clock expiry, two workers, payment-vs-release race, delayed ACH/unknown outcomes, closure race, DB rollback, worker crash, provider outage and safe retry. Contract evidence must distinguish terminal guarantee from synthetic tests.

## Completion boundary

Demonstrate the stated behavior and record evidence. Do not commit, push, deploy, purchase, send messages, modify production data or run real-money transactions without the authorization applicable at implementation time.
