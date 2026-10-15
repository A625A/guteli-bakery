# 13: Complete the practical mobile and owner workflow

**Priority:** P1
**Status:** LOCAL IMPLEMENTATION VERIFIED — owner acceptance and remaining accessibility/provider validation pending; publication of verified changes to main authorized by the owner; no activation authorization.

Evidence: `.scratch/production-readiness/ticket13-checkpoint.md` (2026-10-14, Guatemala).

Approved plan: `docs/plans/2026-10-14-ticket13-experiencia-dueno-cliente.md`.

**What to build:** A nontechnical owner and a mobile customer can complete the supported journey with clear states and accurate bakery information.

**Scope:** Target actual gaps; preserve working product CRUD and visual style. No redesign or new design-plugin installation.

**Blocked by:** 02, 08, 09; owner-approved product/fulfillment content.

## Acceptance criteria

- [ ] Owner approves final prices, sale units, photos/fallbacks, contact, pickup address/hours, delivery promises and operational policies.
- [x] Product create/edit/archive/remove/image flow remains usable; status controls use approachable Guatemalan Spanish copy. Capacity controls are excluded by the owner decision in Ticket03. Delivery quote entry accepts GTQ rather than requiring the owner to calculate centavos, while the server continues storing integer minor units.
- [x] Customer can review full total, understand pending/failure/expiry and recover; catalog/DB outage has a clear safe message.
- [ ] Verify labels, focus, keyboard sequence, screen-reader announcements, contrast, 44px touch targets, mobile overflow/zoom and reduced motion.
- [ ] Spanish owner guide covers daily paid queue, acknowledgement, preparation, contact, cancellation/refund escalation, MFA recovery and checking schedule.

- [x] Only OWNER assigns a per-order method: bank transfer, cash at pickup, cash on delivery, initially unassigned. Enforce fulfillment compatibility, Origin, MFA, version checks, audited changes and terminal/payment locks.
- [x] Assignment neither records/verifies collection nor freezes unpaid prices. Customer and WhatsApp show the method and truthful payment status; private instruction drafts remain owner-only and inactive.
- [x] Product prices and delivery amounts use exact Q inputs; slug suggestions never rewrite existing links; errors remain Spanish; retirement requires confirmation.
- [x] Order reference search, manual customer contact, Guatemala history dates and visible dashboard refresh/freshness preserve existing authorization and privacy.

The owner guide is implemented in Spanish at `docs/operations/guia-del-dueno.md`. A verified-paid acknowledgement queue remains dependent on the separate financial workflow. Keyboard order, visible focus, principal form controls at least 44px tall, and 320/390px reflow were exercised locally; physical-device, screen-reader, complete contrast/zoom acceptance and owner content approval are not claimed.

## Tests and evidence

Owner acceptance script plus desktop/mobile Playwright, keyboard/manual screen-reader sampling and real screenshots; record unresolved issues and do not reuse old screenshots as current evidence.

## Completion boundary

Demonstrate the stated behavior and record evidence. Do not commit, push, deploy, purchase, send messages, modify production data or run real-money transactions without the authorization applicable at implementation time.
