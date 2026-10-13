# 03: Daily production capacity — skipped

**Status:** SKIPPED — explicitly removed from scope by the owner on 2026-10-08. Not implemented or marked completed.

## Owner decision

The bakery accepts scheduled orders and does not currently have enough volume to need automated daily production limits. Do not implement capacity weights, daily budgets, per-product daily caps, capacity reservations, or capacity-based date closures. No capacity-measure question remains pending.

Keep the existing requested-date scheduling, advance-date validation, product availability and finite-stock behavior. Scheduling a requested date does not create a production-capacity reservation.

## Dependency correction

Ticket04 no longer depends on03. Tickets01/04/05/06/07/14 retain their payment verification, promotion-expiry, duplicate-charge prevention, reconciliation and refund requirements, without production-capacity allocation or release requirements. Ticket06 now concerns safe payment expiry and reconciliation.

Payments remain disabled while Ticket01 is blocked. No commits, pushes or public deployment are authorized by this decision.
