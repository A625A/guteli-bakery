# 09: Complete customer WhatsApp order summaries

**Priority:** P1
**Status:** PROVIDER-INDEPENDENT IMPLEMENTATION VERIFIED LOCALLY — real verified-paid acceptance remains blocked by Ticket05 (and Ticket01). Owner authorized committing and pushing the verified manual and automatic-messaging work on 2026-10-13; real activation is not authorized. Oracle/deployment on hold; no automatic WhatsApp sending or payment processing.

**What to build:** After saving an order, its customer can preview/open/copy a current server-generated summary and choose to send it in WhatsApp. Unpaid and pending requests are supported without waiting for payment integration.

**Scope:** Use free official wa.me; no WhatsApp Business API and no automatic delivery claim. Protect full summary separately from minimal receipt.

**Blocked by:** Reuse implemented Ticket02 pricing and checkout credentials. Real verified-payment evidence remains dependent on 05; a PAID marker without that evidence must be labeled unverified, never verified-paid.

## Acceptance criteria

- [x] Summary includes order number, name/phone, products/sale-unit quantities, GTQ total, fulfillment/address, requested date and notes. Distinguish unpaid/pending and explicitly unverified paid/refunded markers.
- [ ] Actual verified-paid status derives from authoritative provider verification evidence. Blocked: this record/adapter is not implemented; a PAID enum is insufficient evidence.
- [x] Full summary requires scoped checkout-owner credential; shared receipt or public ID cannot reveal customer PII.
- [x] Encode once, use configured international owner number, disclose sharing, and avoid PII link analytics/logging. Existing demo/unavailable configuration disables WhatsApp navigation.
- [x] Explain customer must press Send; customer controls the resulting WhatsApp draft. Payment authority remains verified server evidence, never the message.
- [x] No app installed/blocked open/expired credential/long message has accessible copy or safe contact fallback. Browser coverage uses intercepted navigation; native-device acceptance is not claimed.
- [x] Customer declining WhatsApp does not change confirmation or owner discovery.
- [x] Show unit/base prices, non-stacking promotional discounts, quantities/sale units, line totals, shipping (including unquoted), final total, Guatemala pricing timestamp and acceptance state from one coherent server read.
- [x] Refresh before open/copy and compare the preview version; changed price, quote, status or customer details require re-review. Known expiry/focus refresh removes stale previews. The sent text identifies itself as a timestamped summary, not a price lock or payment proof.
- [x] Private preview is opt-in, cookie-scoped and order-matched. No customer data in public receipt HTML, local storage, request URLs, logs or third-party requests before customer action. Return no-store/no-referrer/noindex headers, including failures.

## Tests and evidence

Accent/ampersand/newline/notes boundaries and status mapping units; cross-order/no-credential privacy integration; mobile/desktop browser open/copy flow and customer refusal. Do not send a real WhatsApp message in automated tests.

See [Ticket09 checkpoint](../ticket09-checkpoint.md) for implementation, reproducible commands, test outcomes and remaining limits.

## Automatic messaging extension — approved 2026-10-13

Use direct Meta Cloud API for customers with explicit checkout consent, plus the separately configured/consented owner on order submission. Preserve manual handoff. The local worker, migrations, callback route, disabled configuration and tests are implemented; do not equate this with live-provider verification.

- [x] Atomically store consent evidence and one outbox event per order/recipient role; retries cannot duplicate order events or silently change consent.
- [x] Refresh unpaid pricing before sending/retrying, include complete line prices/discounts/shipping uncertainty, and retain immutable paid-marker amounts without claiming payment verification.
- [x] Send only approved configured templates through the existing official Meta adapter; missing gates disable sending and oversized summaries are held without truncation.
- [x] Claim work atomically; bound rate-limit retries; hold uncertain sends and crashed workers for review rather than duplicate them.
- [x] Validate webhook signatures, size/deadline, account, sender and recipient; track acceptance separately from delivery/read and reconcile early/out-of-order callbacks.
- [x] Persist customer opt-out suppression and support operator-recorded off-channel withdrawals. Keep consent optional and keyboard accessible.
- [x] Provide private admin delivery status, a bounded worker command and a setup/recovery guide. Logs omit personal details, provider bodies and secrets.
- [ ] Verify Meta account eligibility, sender number, current API version, approved templates/full-cart fit, rate card, HTTPS subscription and real delivery with explicit activation authorization.
- [ ] Enable future payment confirmations only after Ticket05 authoritative verification; forged/unsupported payment events are not dispatched now.

See [automatic messaging specification](../../../docs/superpowers/specs/2026-10-13-whatsapp-automation.md) and [operator setup guide](../../../docs/operations/whatsapp-automation.md). Oracle remains untouched, payments disabled, and no further ticket starts automatically.

## Completion boundary

Demonstrate the stated behavior and record evidence. Do not commit, push, deploy, purchase, send messages, modify production data or run real-money transactions without the authorization applicable at implementation time.
