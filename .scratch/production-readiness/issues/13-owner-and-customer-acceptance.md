# 13: Complete the practical mobile and owner workflow

**Priority:** P1
**Status:** draft — awaiting owner approval; not authorized for implementation.

**What to build:** A nontechnical owner and a mobile customer can complete the supported journey with clear states and accurate bakery information.

**Scope:** Target actual gaps; preserve working product CRUD and visual style. No redesign or new design-plugin installation.

**Blocked by:** 02, 08, 09; owner-approved product/fulfillment content.

## Acceptance criteria

- [ ] Owner approves final prices, sale units, photos/fallbacks, contact, pickup address/hours, delivery promises and operational policies.
- [ ] Product create/edit/archive/remove/image flow remains usable; status and capacity controls use approachable Spanish copy. Delivery quote entry accepts GTQ rather than requiring the owner to calculate centavos, while the server continues storing integer minor units.
- [ ] Customer can review full total, understand pending/failure/expiry and recover; catalog/DB outage has a clear safe message.
- [ ] Verify labels, focus, keyboard sequence, screen-reader announcements, contrast, 44px touch targets, mobile overflow/zoom and reduced motion.
- [ ] Spanish owner guide covers daily paid queue, acknowledgement, preparation, contact, cancellation/refund escalation, MFA recovery and checking schedule.

## Tests and evidence

Owner acceptance script plus desktop/mobile Playwright, keyboard/manual screen-reader sampling and real screenshots; record unresolved issues and do not reuse old screenshots as current evidence.

## Completion boundary

Demonstrate the stated behavior and record evidence. Do not commit, push, deploy, purchase, send messages, modify production data or run real-money transactions without the authorization applicable at implementation time.
