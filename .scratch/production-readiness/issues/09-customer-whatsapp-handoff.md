# 09: Send complete verified order details through Click-to-Chat

**Priority:** P1
**Status:** draft — awaiting owner approval; not authorized for implementation.

**What to build:** After server confirmation, the customer can preview/open/copy their complete order message and choose to send it in WhatsApp.

**Scope:** Use free official wa.me; no WhatsApp Business API and no automatic delivery claim. Protect full summary separately from minimal receipt.

**Blocked by:** 02, 05.

## Acceptance criteria

- [ ] Summary includes order number, name/phone, products/sale-unit quantities, GTQ total, fulfillment/address, requested date, notes and actual verified payment status.
- [ ] Full summary requires scoped checkout-owner credential; shared receipt or public ID cannot reveal customer PII.
- [ ] Encode once, use configured international owner number, disclose sharing, and avoid PII link analytics/logging.
- [ ] Explain customer must press Send and may edit; payment authority remains the admin record.
- [ ] No app installed/blocked open/expired credential/long message has accessible copy or safe contact fallback.
- [ ] Customer declining WhatsApp does not change confirmation or owner discovery.

## Tests and evidence

Accent/ampersand/newline/notes boundaries and status mapping units; cross-order/no-credential privacy integration; mobile/desktop browser open/copy flow and customer refusal. Do not send a real WhatsApp message in automated tests.

## Completion boundary

Demonstrate the stated behavior and record evidence. Do not commit, push, deploy, purchase, send messages, modify production data or run real-money transactions without the authorization applicable at implementation time.
