# 07: Cancel orders and track real refunds safely

**Priority:** P0
**Status:** draft — awaiting owner approval; not authorized for implementation.

**What to build:** The owner can handle cancellation/refund without falsely returning funds or undoing production history.

**Scope:** Whole-order cancellation for launch; record partial external refunds and disputes honestly. No automatic rebooking or physical-stock restoration for prepared goods.

**Blocked by:** 05, 06; approved cancellation cutoff and method-specific refund policy.

## Acceptance criteria

- [ ] Cancellation requires role/Origin/version and recent reauthentication where sensitive; stop new payment attempts.
- [ ] A payable/pending/unknown checkout cannot free capacity until the safe-release rule succeeds.
- [ ] Refund request has a stable key, bounded amount and verified provider identity; unknown result is reconciled without duplicate refund.
- [ ] Only authoritative refund success updates refunded totals; partial refunds have an explicit state and never display full refund.
- [ ] Operational status and allocation follow approved cutoff rules independently from money; completed production history stays intact.
- [ ] Late/unmatched funds, unsupported ACH refunds and disputes have an owner-visible documented manual resolution path; screenshot is not settlement proof.

## Tests and evidence

Repeated refund request, partial/full/refund-over-total, unknown timeout, role/CSRF/stale writer, cancellation racing success, refund after completion and unsupported-method fallback; Sandbox where supported and fixtures otherwise.

## Completion boundary

Demonstrate the stated behavior and record evidence. Do not commit, push, deploy, purchase, send messages, modify production data or run real-money transactions without the authorization applicable at implementation time.
