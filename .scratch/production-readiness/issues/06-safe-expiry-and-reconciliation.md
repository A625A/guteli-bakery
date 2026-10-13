# 06: Expire and reconcile payment attempts safely

**Priority:** P0
**Status:** draft — awaiting owner approval; not authorized for implementation.

**What to build:** Expired or unresolved payment attempts are reconciled without stale promotional pricing or duplicate collection.

**Scope:** Durable expiry/reconciliation jobs, leases, heartbeat and owner exception view; no assumption of terminal non-payability based solely on local time.

**Blocked by:** 01, 05; approved waiting/escalation policy.

## Acceptance criteria

- [ ] Expired promotional revisions and old payment links cannot collect stale amounts. Require the provider-supported terminality policy from Ticket 01; no local-clock-only guarantee. Reprice unpaid checkout and require new acceptance before a replacement attempt, without discarding unknown or late funds.

- [ ] At display expiry remove payment action, retrieve provider truth and expire/invalidate only where supported.
- [ ] Pending/unknown creation or payment blocks replacement collection; alerts explain why and show age.
- [ ] Replacement collection requires documented and tested terminal non-payability of the previous attempt; unsupported automatic replacement remains disabled.
- [ ] Attempt state transitions happen once in the shared transaction/lock protocol; this ticket does not add production counters or automatic stock restoration.
- [ ] Worker restarts and competing workers recover leases without duplicate processing; provider outage preserves unresolved financial work.
- [ ] Late success never disappears or silently validates expired promotional pricing; create financial exception and require owner resolution. Its occurrence is evidence to revisit the payment-validity contract.

## Tests and evidence

Frozen-clock expiry, two workers, payment-vs-expiry race, delayed ACH/unknown outcomes, DB rollback, worker crash, provider outage and safe retry. Contract evidence must distinguish terminal guarantee from synthetic tests.

## Completion boundary

Demonstrate the stated behavior and record evidence. Do not commit, push, deploy, purchase, send messages, modify production data or run real-money transactions without the authorization applicable at implementation time.
