# 03: Reserve production on an available date

**Priority:** P0
**Status:** PENDING — implementation conditionally authorized once Ticket 02 dependencies and owner-approved capacity rules allow it.

**What to build:** The owner sets a simple date budget/closed date and customers can reserve only available production.

**Scope:** Daily order count OR approved weighted sale units, plus only needed per-product caps. Keep global stock distinct. No provider calls in database transactions.

**Blocked by:** 02; approved capacity measure, limits, production-date mapping, advance/cutoff and booking horizon.

## Acceptance criteria

- [ ] Owner can set approved daily capacity and closed dates with authentication, Origin, version checks and plain Spanish validation.
- [ ] Customer receives an explicit date-unavailable result before any payment action; reservation, snapshots and order commit together.
- [ ] Reserved plus committed allocation cannot exceed daily or per-product limits under concurrent buyers; stable lock order applies to reservations, closure and future financial transitions.
- [ ] Closing a date or lowering a limit cannot evict current holds/commitments; return conflicts.
- [ ] Repeated checkout reserves once. Abandonment does not auto-release until the future provider-safety rule exists; no clock-only release shortcut.
- [ ] Existing finite-stock behavior is preserved for old orders; new finite-stock allocations record enough information for exactly-once safe release. On-demand products use date capacity, not invented warehouse stock.

## Tests and evidence

Real PostgreSQL two-connection last-slot race, product/day caps, concurrent closure, rollback on late insert failure, duplicate reservation and Guatemala date boundaries; browser owner settings and unavailable-date explanation.

## Completion boundary

Demonstrate the stated behavior and record evidence. Do not commit, push, deploy, purchase, send messages, modify production data or run real-money transactions without the authorization applicable at implementation time.
