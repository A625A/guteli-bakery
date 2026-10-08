# Güteli commercial checkout: proposed specification

Date: 2026-10-07, America/Guatemala. **Execution authorization updated 2026-10-08.** The owner authorized Ticket 02, independent Ticket 10 work, and Ticket 03 once dependencies and business rules allow it, using TDD and reviewed commits/pushes. Ticket 01 is **BLOCKED — external provider verification required** because no Recurrente account exists. The remaining proposed business policies require the interactive one-question-at-a-time workflow. See the [implementation record](../../implementation/2026-10-07-checkout-progress.md).

This specification uses the installed to-spec, domain-modeling and codebase-design guidance. Authorization to implement does not approve every proposed business policy below.

Evidence: [current-state audit](../../audits/2026-10-07-production-readiness.md), [provider research](../../research/2026-10-07-recurrente-whatsapp.md), [glossary](../../../CONTEXT.md), [tickets](../plans/2026-10-07-production-launch-tickets.md).

## Problem Statement

Customers can submit durable bakery order requests but cannot pay a verified final amount or reserve production for a date. The owner already has catalog and order administration; rebuilding it would waste working functionality. A successful customer payment must never depend on a WhatsApp message being sent, and an abandoned checkout must not lead to unsafe resale of capacity while a transfer can still arrive.

## Solution

Extend the existing Next.js/TypeScript/PostgreSQL/Drizzle application with a resumable, prepaid checkout. The server validates customer information, products, complete total and date capacity, saves an order and reservation, opens a real hosted Recurrente checkout only when eligible, verifies collection, commits production capacity and exposes the order to the owner. WhatsApp is an optional explicit handoff after server confirmation.

For delivery, retain the existing manual quote path: request → owner quotes delivery → customer reviews/accepts full total → capacity validation/reservation → payment. An unquoted request holds no production capacity and receives no payment URL. This uses existing operations and does not require maps. Previously documented automatic coverage remains an optional separate extension, without invented polygons or silent policy changes.

The strict no-payment-for-an-unavailable-slot requirement is a launch gate, not a guarantee this document can infer from provider marketing. In-flight/unknown funds retain capacity. If the provider cannot establish terminal non-payability, retain the request-only mode or choose an owner-approved supported method/policy; never fake success or rely on refunds as proof of prevention.

## User Stories

1. As a customer, I want current products, photographs, sale units, prices and availability, so I know what I am ordering.
2. As a customer, I want to edit quantities in my cart, so I can assemble the right order.
3. As a customer, I want to provide my name, phone, requested date, fulfillment and notes, so the bakery can fulfill it.
4. As a customer, I want unavailable dates and exhausted capacity explained, so I can choose another date before paying.
5. As a customer, I want a complete GTQ total, including delivery, so I approve the actual amount charged.
6. As a delivery customer, I want to return to an accepted quote without entering a second order, so I can pay after the owner confirms the delivery cost.
7. As a customer, I want price or quote changes to require another review, so I never pay an unexpected amount.
8. As a customer, I want a supported hosted payment method, so the bakery never handles my card details.
9. As a customer, I want refresh, retry and return from the provider to recover my checkout, so network errors do not create duplicates.
10. As a customer, I want pending, failed, expired and verified payment states explained accurately, so a redirect does not mislead me.
11. As a customer, I want confirmation to survive closing the browser, so my paid order is still recorded.
12. As a customer, I want to open WhatsApp with complete order details and copy them if opening fails, so I can contact the owner voluntarily.
13. As a customer, I want my personal information kept out of public receipts and logs, so sharing a status link does not expose my address or phone.
14. As the owner, I want to continue using existing product/category/image administration, so I need no second catalog.
15. As the owner, I want a simple daily production limit and closed dates, so the bakery accepts only work it can produce.
16. As the owner, I want accepted commitments protected when I change a limit, so closing a date cannot silently cancel paid orders.
17. As the owner, I want verified paid orders visible and awaiting acknowledgement, so I discover them without customer WhatsApp delivery.
18. As the owner, I want payment amount, currency, reference and verification time, so I can distinguish provider evidence from customer claims.
19. As the owner, I want a customer WhatsApp action and the existing preparation/ready/completed workflow, so daily operations stay simple.
20. As the owner, I want cancellations and refunds tracked separately, so I do not assume money has been returned because an order was canceled.
21. As the owner, I want delayed, mismatched, duplicate, disputed or partially refunded funds surfaced for resolution, so no money silently disappears.
22. As the operator, I want duplicate/out-of-order events and restarts to be safe, so they never overbook or confirm twice.
23. As the operator, I want backup/restore, health and reconciliation monitoring, so a failure can be detected and recovered.
24. As the owner, I want a Spanish operational guide and an agreed order-checking routine, so running the system does not require technical expertise.

## Implementation Decisions

### Reuse and scope

Keep one modular Next.js monolith, one PostgreSQL database, Drizzle migrations, Better Auth, Docker, Vitest and Playwright. Keep integer GTQ centavos. Reuse existing catalog locks, order snapshots, opaque receipts, authorization, origin checks, request IDs, rate limits and order audit. No Prisma, Oracle, Redis, message broker, warehouse management, new customer accounts or WhatsApp Business API is required.

The old backend operations plan proposed S3 and paid Meta dispatch. This draft proposes persistent local uploads plus off-host backup when a single durable host supports it, and admin discovery plus Click-to-Chat. Those are explicit alternatives awaiting approval, not a declaration that existing requirements or WIP were removed. Do not merge, discard or reimplement the dirty notification worktree as part of payment work without a separate review.

### Interfaces and ownership

Use the existing order use case as the main customer test interface. Add a small checkout interface for reviewing/accepting a total, starting/resuming an attempt and reading safe status. Internally, capacity allocation and financial event application perform their transaction work together. A single Recurrente adapter hides HTTP authentication, amounts, payload normalization, expiry and status retrieval; tests can inject fixture transport. Avoid a generic provider framework for hypothetical vendors.

The financial application interface accepts an authenticated provider event reference or a scheduled reconciliation request. It re-fetches authoritative provider records before proposing a database transition. Public and admin routes cannot call an arbitrary “mark paid” action. The owner-operation interface retains live authorization and expected-version checks and adds acknowledgement, safe cancellation and customer-contact actions.

### Proposed data additions

| Record                  | Minimum information and constraints                                                                                                                                                                                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checkout revision       | Order association, canonical request hash, accepted item/delivery/total snapshots, GTQ, quote revision, acceptedAt, production date and expected order version. Unique attempt identity for same logical submission; totals immutable once payable                                       |
| Daily production budget | One row per production date; closed flag, positive capacity or explicit zero/closed, reserved/committed counters, version. Owner-approved default and optional date overrides; check nonnegative counters and never allow a reduction below existing obligations                         |
| Product capacity rule   | Optional positive weight per sale unit and optional daily maximum. Start with one approved policy; do not build both a full order-count engine and a complex weighted engine unnecessarily                                                                                               |
| Capacity reservation    | Unique checkout/order allocation; date, snapshotted weights/quantities, state HELD/COMMITTED/RELEASED, display expiry, provider-safety/reconciliation state, timestamps. Release and commit occur at most once                                                                           |
| Payment attempt         | Unique local attempt ID; order/revision, amount/currency/environment, unique provider checkout association once known, active/creating/unknown/terminal state, provider expiry, reconciliation lease/backoff and timestamps. At most one payable or unresolved attempt per revision      |
| Provider intent/payment | Unique provider account/environment plus canonical financial identifier, checkout mapping, amount, currency, verified state/time. Multiple financial records may exist for one checkout; distinguish duplicate event delivery from an actual second charge                               |
| Webhook inbox           | Unique endpoint/account/environment plus authenticated delivery ID; verified bounded event data, status/lease/attempts, received/processed times and safe error code. Minimize/redact PII; if raw retention is required for durable parsing, protect it and give it a short approved TTL |
| Refund record           | Unique logical refund request/idempotency key, provider refund ID, amount, pending/succeeded/failed/unknown state and verified timestamp. Sum of successful refunds cannot exceed verified collections                                                                                   |
| Owner acknowledgement   | Order ID, actor and acknowledgedAt; paid-unacknowledged count derives from persisted verified state. Transactional event uniqueness prevents duplicate owner tasks                                                                                                                       |

Add only necessary columns/tables with forward-compatible Drizzle migrations. Existing RECEIVED/UNPAID orders remain historical requests without fabricated capacity or payment evidence. Existing order item snapshots and product foreign keys remain valid. Importing a legacy request into new checkout requires new capacity validation and explicit total acceptance; never backfill it as paid.

### Customer contracts

| Operation                      | Input / authorization                                                                                    | Result and errors                                                                                                                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Review checkout                | Product IDs/quantities, contact, date, fulfillment; customer recovery credential for an existing request | Server-priced revision; delivery awaiting quote or full GTQ total. No client authoritative totals accepted                                                                       |
| Accept total / reserve         | Revision and expected version, idempotency key, checkout-owner credential                                | Atomically validates products/date/capacity, saves or reuses order and hold. Stale quote/price/date returns 409 and requests review; unavailable returns 409 without payment URL |
| Start/resume hosted payment    | Authorized checkout revision, stable attempt identity                                                    | Same persisted checkout URL/status for retry. Disabled provider 503/PAYMENTS_DISABLED; unresolved create returns pending/unknown, no new payable URL                             |
| Customer status                | Existing opaque minimal receipt token                                                                    | Order number, item snapshots, totals, requested date and verified financial/operational state; no customer PII                                                                   |
| Customer WhatsApp summary      | Separate checkout-owner credential tied to this order                                                    | Bounded full summary from saved customer data plus current verified payment record; private/no-store; no PII on the general receipt endpoint                                     |
| Provider webhook               | Raw bounded body and official signature headers                                                          | Durable acceptance only after valid authentication and unique inbox insert; temporary DB failure non-2xx; duplicate durable delivery safe 2xx                                    |
| Admin quote/acknowledge/cancel | Existing MFA role, trusted Origin, expected version; recent reauth for sensitive actions                 | Audited change; stale write 409; cannot override payment truth, active payable amount or unsafe reservation release                                                              |

Continue the existing Spanish safe error envelope with request ID; never echo raw provider body or credentials. Treat rate limits and request size/time bounds as server responsibilities. Top-level provider redirects must be HTTPS and match the verified provider origin; reject untrusted URLs and credentials in URLs. Success/cancel return URLs are fixed application URLs, not arbitrary user inputs, and carry no PII or receipt token to the provider unnecessarily.

### Order, financial and reservation states

| Event                                                       | Financial consequence                                             | Order / capacity consequence                                                                                                                               |
| ----------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Request saved, delivery unquoted                            | UNPAID                                                            | RECEIVED, no hold, payment unavailable                                                                                                                     |
| Full total accepted and capacity available                  | UNPAID then PENDING when attempt begins                           | RECEIVED + HELD; not yet promised as confirmed                                                                                                             |
| Redirect says success                                       | None                                                              | Read/poll server; stay pending until verified                                                                                                              |
| Authoritative succeeded collection matches revision         | PAID                                                              | Same transaction changes HELD → COMMITTED, RECEIVED → CONFIRMED and makes owner acknowledgement due                                                        |
| Retryable provider timeout / unknown creation               | Unknown attempt, not paid                                         | Keep HELD; hide unsafe action and reconcile                                                                                                                |
| Payment failed/expired with proven no-payability            | FAILED or terminal attempt, no fictional EXPIRED collection       | Release HELD once; order remains an unconfirmed request eligible for explicit revalidation/retry or cancellation                                           |
| Late success / wrong amount / wrong currency / extra charge | Record financial fact, flag resolution required                   | Never discard funds, auto-confirm without allocation or oversell. Human resolution; incident evidence means release invariant must be revisited            |
| Customer/owner cancellation before production               | Cancel request recorded; refund separate if funds collected       | Stop new payment creation; existing payable attempt must become non-payable before held release. Committed capacity release follows approved cutoff policy |
| Refund requested / unknown result                           | Keep paid ledger plus REFUND_PENDING/unknown refund               | Do not claim refunded or reverse production automatically                                                                                                  |
| Partial refund verified                                     | Derive PARTIALLY_REFUNDED (extend current enum or DTO explicitly) | Surface amount and owner resolution; do not call fully refunded                                                                                            |
| Full refund verified                                        | REFUNDED                                                          | Fulfillment state remains historically accurate; canceled order does not automatically reopen                                                              |
| Dispute / reversal                                          | Surface financial exception from verified provider record         | Owner attention, never silently return to UNPAID or pretend fulfilled work was undone                                                                      |

Retain existing PREPARING → READY → COMPLETED and delivery OUT_FOR_DELIVERY semantics, but require valid paid/allocated confirmation for the new prepaid cohort. Historical manual requests must remain distinguishable; no unrestricted manual “paid” toggle. Agree whether new unpaid manual orders are allowed before exposing that exception.

### Transaction and concurrency algorithm

1. Validate the existing strict customer contract, Guatemala-local date, advance rule, booking horizon, catalog availability and server total. Resolve idempotent replay before creating new allocations. Recover the same logical checkout across reload with a server-issued Secure/HttpOnly/SameSite checkout-owner credential; do not persist full name/address/notes in browser storage.
2. In a short database transaction, lock the day-budget row, relevant product-limit rows in stable ID order, then order/attempt rows using one documented lock order across all capacity/payment/admin paths. Safely create missing day rows under unique constraints. Concurrent reservations, releases, confirmations and closure all use this protocol.
3. Recheck accepted price/quote version, eligibility and budget inside that transaction. Assert used + requested ≤ limit and per-product limits. Increment held counters and persist order/immutable snapshots/reservation/creating attempt/idempotency together, or roll everything back. No provider network call occurs under those locks.
4. Claim the creating attempt with a durable lease, commit, then call Recurrente. Save the returned checkout ID and verified URL before responding. If the database save fails after remote creation, or the response is lost, mark/recover as unknown and block competing creation. Do not blindly retry POST unless its official idempotency/recovery contract has been proved in ticket 01.
5. Verify webhook raw bytes using the official Svix contract, timestamp window and all supported rotated signing keys. Persist the unique authenticated delivery before 2xx. A worker fetches checkout and intent using the configured merchant key; compare merchant environment, saved mapping/reference, GTQ and **gross** total (not settlement net of fees), intent association and collection success.
6. Under the same lock protocol, apply the verified financial fact once, convert allocation once, update order once and persist owner visibility/event once. A later pending/failed event cannot downgrade verified success. Re-fetch current truth for out-of-order events; distinct refunds/disputes are legitimate later financial events, not duplicate success.
7. After a customer-facing timeout, stop offering the old URL and reconcile/expire it where supported. **Clock expiry alone never decrements held counters.** Pending/unknown provider records remain held. Release only on documented and tested terminal non-payability plus reconciliation, atomically mark release and counters. If payment races release, locks plus authoritative terminality prevent both from winning; if a late success is possible, that method must not use automatic release.
8. Run bounded durable reconciliation/expiry work under PostgreSQL leases with backoff and a heartbeat. It may run in the existing always-on app process; if hosting suspends it, use a host scheduler for the same code. Do not rely on a user's return, browser poll or request `after()` alone. No new queue service required. Expired worker leases are recoverable; work is idempotent across restarts and two instances.

Existing finite stock remains a separate constraint. For on-demand products, use null stock and the approved date budget. If finite stock remains enabled, reserve/decrement it atomically with the hold and restore exactly once on safely abandoned uncommitted checkout; do not restore already-used physical stock merely because a prepared order is canceled. This changes behavior only for new checkout allocations, not historical decrements.

Capacity weights, limits, booking horizon, production-day mapping, hold window, support cutoff and cancellation cutoff require owner approval. A closing date or limit reduction cannot evict active holds/committed orders; reject with conflicts and require explicit rescheduling/cancellation handling. Neither 10-minute transfer guidance nor a 10-minute delivery quote is a capacity TTL guarantee.

### Payment integration contract and fail-closed behavior

Use official hosted checkout, GTQ one-time payments, server-only merchant key and a separate webhook secret. Confirm fees, limits and activation in the actual merchant account. Keep new collection disabled unless the real adapter and required settings are present; no fake checkout URL or simulated payment in production. Turning off new collection must not stop authenticated event ingestion/reconciliation or explicitly authorized refunds for previously issued attempts. If credentials are missing, preserve durable pending work, retain affected capacity and alert the owner rather than discard events or release allocations. Test fakes stay in tests only.

Ticket 01 must prove: POST-create idempotency or recovery lookup, metadata round-trip, amount units/minimum, canonical checkout/intent mapping, exact signed envelope, enabled card/ACH events, expiry and in-flight payment semantics, refund capabilities and environment isolation. Documentation presently differs on webhook examples and old Sandbox behavior; do not build an overly permissive parser to guess what production sends.

Sandbox card success is not real ACH timing/settlement proof. If live ACH evidence is needed, stop that validation at a separately approved capped live test. A supported card-only launch is an owner decision and still requires card expiry-race verification. Manual bank transfer is only a fallback with owner-held capacity and independent bank/provider verification; a receipt screenshot is insufficient.

### WhatsApp and reliable owner workflow

After verified confirmation, generate a Spanish message from the immutable order and current verified status. Include order number, customer name/phone, sale-unit quantities, total labeled GTQ, delivery/pickup details, requested date, notes, and “Pago verificado” only when verified. Encode once using the existing URL builder, configured international owner number and HTTPS wa.me. Preview the content, disclose sharing with WhatsApp, provide copy fallback, and explain that the user must press Send. The customer may edit the message, so the owner checks the admin record to verify any claim.

The minimal bearer receipt must remain PII-free. A separate scoped checkout-owner cookie can authorize the full summary on return/reload without customer accounts. Hash the credential server-side, bound lifetime, use no-store/no-referrer and redact it from logs. If it expires or is lost, show minimal receipt and general contact; do not leak PII based only on public order number. Agree an owner-assisted recovery flow rather than treating a phone number alone as authentication.

Add a persistent “Paid — awaiting acknowledgement” view, count, visible last-refresh time, failure/staleness message, manual refresh and acknowledgement. Poll while visible; refresh immediately on return to the tab. Closing the customer browser has no effect on this queue. An acknowledgement is an owner's explicit action, not a page view or WhatsApp click. Add an owner action to open a customer chat using validated phone normalization, never a browser-supplied URL.

This guarantees durable discoverability, not an out-of-band alert to a sleeping/offline owner. Agree a dashboard-check schedule before launch. If the owner cannot meet it, approve one reliable extra channel; do not silently introduce paid WhatsApp. Preserve existing Meta adapter/WIP as deferred work and avoid displaying disabled automatic delivery as perpetually “sending.”

### Operations, security and owner experience

Use the existing owner auth/MFA and reauthentication, not a new login system. Keep product CRUD intact; fix only observed gaps (daily settings, contact link, financial detail and approachable Spanish status labels). Soft removal preserves order history; hard-delete is not necessary for the commercial requirement.

Define a production environment contract: independent auth/rate/receipt/payment/webhook secrets, canonical HTTPS origin, trusted proxy hops, private DB, storage path/driver, worker enablement and safe integration defaults. Fail startup/readiness for missing required live config. Public demo/live settings are build-time inputs in current Next.js; merely changing container runtime values is insufficient. Keep production credentials outside image layers and scripts.

Serve behind an HTTPS edge with certificate renewal and HSTS after HTTPS verification. Sanitize forwarded headers, block direct app ingress, keep DB private, and test authorized access via the real TLS path. Readiness should check schema/config/storage and reconciliation heartbeat in addition to database connectivity; distinguish a transient provider incident from whether the process itself is alive.

For a single durable host, local uploaded files plus database and off-host encrypted backups can be sufficient after explicit approval. For ephemeral or scaled hosts, implement object storage through the existing interface. Back up DB and uploads consistently, prove restoration to another isolated target, document rollback/migrations and choose RPO/RTO. Add bounded cleanup, retention and log redaction without copying PII into audit metadata. Financial evidence required for reconciliation/refunds must outlive idempotency windows; PII retention is a separate owner-confirmed policy.

Mobile controls must remain keyboard/screen-reader accessible; pending status must not steal focus repeatedly, errors preserve entered data and provide retry/contact, and unavailable dates have a readable explanation. No animation or broad redesign is needed. Verify small screens, slow network, large text, high zoom, reduced motion, tab order, focus, contrast and payment return from an external app.

## Testing Decisions

Test external behavior at the existing order/route interfaces with real isolated PostgreSQL for transactions. Pure unit tests cover amounts, weights, dates, normalization, state rules and provider transport parsing. Fake transports demonstrate application behavior, not actual Recurrente guarantees. Existing concurrency, idempotency, receipt, admin-boundary and catalog tests are prior art.

| Scenario                                               | Required observable result                                                                                            |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Two buyers, one remaining slot                         | Exactly one reservation/payment URL; no negative counters or partial orders                                           |
| Multiple sale units/products                           | Weighted daily and product ceilings both enforced; sale bag vs individual piece unambiguous                           |
| Duplicate request, lost response, reload               | Same logical order and attempt; stable recovery without browser PII persistence                                       |
| Same key with changed body/version                     | Conflict and re-review, not silent reprice or second order                                                            |
| Provider creates but response/save is lost             | Unknown state, held slot, no blind create retry; reconciliation/owner queue                                           |
| Pending ACH beyond display expiry                      | Held slot remains unavailable to others; honest pending/support UI                                                    |
| Expiry racing success                                  | At most one financial application/allocation transition; safe release requires provider terminal proof                |
| Forged/stale webhook or oversized input                | Rejected without mutation; raw bytes verified before parsing                                                          |
| Same delivery retried; different delivery same payment | Durable dedupe; one confirmation, no duplicate notification/task                                                      |
| Wrong amount/currency/order/environment/type           | Quarantined, no confirmation, actionable safe admin reason                                                            |
| Webhook precedes API response                          | Inbox waits/reconciles mapping; never drops a legitimate early payment                                                |
| Worker crashes before/after acknowledgement            | Durable replay/recovery, no lost event or repeated business transition                                                |
| Provider/server outage and delayed event               | Orders survive; bounded retry; owner sees stale/unresolved state                                                      |
| Quote/price/date edited while payable                  | Reject or safely terminate old attempt then require new acceptance; never mutate its charge                           |
| Close/reduce date with active obligations              | Reject unsafe reduction, show conflicts and preserve commitments                                                      |
| Cancellation, full/partial refund, dispute             | Financial ledger and production remain separate, repeat refund safe, no false refunded status                         |
| Browser closes before return / no WhatsApp             | Owner queue still shows verified paid order                                                                           |
| WhatsApp accents, ampersands, multiline/long notes     | Correct encoding, bounded message, complete required content or explicit copy fallback, no authority from edited text |
| Receipt shared / checkout cookie missing               | No name, phone, address or notes disclosed                                                                            |
| Existing admin and catalog operations                  | Role/MFA/Origin/version boundaries and image cleanup remain intact                                                    |
| Restart/restore                                        | DB records, images, pending work, idempotency and safe worker recovery remain coherent                                |

Run lint/type/build/unit checks, isolated DB integrations, browser journeys, production-mode TLS security checks and restore drill with dated evidence. Include fresh provider Sandbox contract fixtures and, only with separate approval, the minimum real-method verification needed. Current audit evidence does not claim integration/E2E/runtime readiness.

## Out of Scope

Public deployment, paid resources, provider account creation, live payment tests, production data changes and WhatsApp sending remain outside authorization. Future initial launch: warehouse forecasting, subscriptions/installments, customer accounts, multi-tenant platform, marketing automation, paid WhatsApp API, map editor, multiple databases and broad redesign.

## Further Notes

Owner decisions and launch checklist are in the audit. No invented capacity numbers, new tariffs, retention periods or refund promises are approved here. No existing delivery specification is overwritten. Follow the authorized ticket scope above and stop for unresolved business decisions. Public launch retains a separate approval gate even after all tickets pass.
