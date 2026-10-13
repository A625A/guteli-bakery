# 04: Open one real hosted payment attempt

**Priority:** P0
**Status:** draft — awaiting owner approval; not authorized for implementation.

**What to build:** An eligible customer opens the real provider checkout for the accepted amount without creating duplicate or stale payment attempts.

**Scope:** Real Recurrente adapter behind disabled-by-default configuration. Fixture transport only in tests, never a fake production payment.

**Blocked by:** 01, 02; owner-approved methods and Sandbox credentials.

## Acceptance criteria

- [ ] Revalidate current catalog prices, quantities, promotion validity and customer-accepted full total immediately before initiation; stale revisions require review. Save bounded immutable attempt pricing, recheck after the external call, and prevent concurrent edits/expiry from exposing a stale link. Provider-enforced validity must satisfy Ticket 01; an unresolved prior attempt prevents replacement collection.

- [ ] Missing/disabled collection configuration prevents new checkout links and invented financial success; server credentials never enter client bundles/logs. Switching collection off preserves reconciliation and authorized refunds for existing attempts; missing credentials retain pending financial work and raise an alert.
- [ ] Save durable local attempt before external call, send server snapshots/GTQ/reference, save validated provider mapping before exposing the URL.
- [ ] Only one payable or unresolved attempt per checkout revision; repeated action returns the saved attempt.
- [ ] Ambiguous provider success or failed local persistence stays unknown and blocks replacement collection; recover using ticket 01 contract, never blindly recreate.
- [ ] Unquoted delivery, changed total, invalid requested date or unavailable products never receives a payment URL.
- [ ] Success/cancel redirects show server-derived pending/status; browser parameters never mark paid.

## Tests and evidence

Adapter contracts for amount units, reference, environment and allowed URL; DB competing creation, timeout before/after remote success and database-save failure; Sandbox hosted checkout; browser retry/return/tampered success query.

## Completion boundary

Demonstrate the stated behavior and record evidence. Do not commit, push, deploy, purchase, send messages, modify production data or run real-money transactions without the authorization applicable at implementation time.
