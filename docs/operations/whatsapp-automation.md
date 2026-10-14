# Güteli automatic WhatsApp order messages

Ticket09, 2026-10-13. Local implementation only. No production deployment, Meta account changes, messages to real recipients, or payment activation is authorized. Oracle and the hackathon website remain untouched.

## What is implemented

Checkout records an optional, unchecked customer opt-in with its wording/version, number and timestamp. The same transaction creates the existing owner event and, only with consent, a customer event. Unique event keys and order idempotency prevent duplicate queue entries. Declining consent does not prevent ordering or using the manual preview/copy flow. Owner notifications have a separate configured recipient and consent gate.

A worker processes at most 25 events per invocation. It claims events atomically and refreshes current unpaid prices through the existing pricing transaction before each attempt. The full summary includes products, quantities/sale units, regular/effective prices, discount labels and savings, shipping uncertainty, total, reference, requested date, customer fulfillment details, payment and acceptance status, and a Guatemala pricing timestamp. It never accepts a changed total for the customer. Paid/refunded markers preserve their existing snapshot but are explicitly unverified; they cannot trigger a payment-confirmation message.

The approved template contract is `guteli-order-summary-v1`: separate customer and owner utility templates, each body-only with exactly one text parameter containing the full flattened summary. The surrounding fixed template wording must identify an order request, not verified payment. Newline/tab characters are not sent in parameter text. No order is truncated or silently split. Messages exceeding the externally verified configured ceiling are held with `PAYLOAD_UNREPRESENTABLE`; manual preview/copy still works. **Template approval, exact limits and largest-cart acceptance remain external blockers.** If Meta rejects this mapping, revise the adapter after confirming the approved alternative; do not simply acknowledge an unapproved contract.

A successful API response means **accepted**, not delivered. The existing protected order screen shows separate queued, in-flight, accepted, sent, delivered, read, failed, blocked and uncertain states. HMAC-authenticated callbacks validate business account, sender number and recipient; duplicate/out-of-order events cannot downgrade delivered/read. A minimal durable inbox preserves early callbacks received before the API response is saved.

Definitive HTTP429 rejection retries with 60/120/240/480-second backoff, at most five network attempts. Each retry rechecks consent, suppression, order eligibility and pricing. Other permanent HTTP errors are held as failed. Timeouts, network failures, HTTP5xx, invalid success responses and crashed in-flight claims are uncertain and **never automatically resent**. A provider may have accepted a request before the connection failed; no exactly-once guarantee is claimed. Examine provider records before deciding whether a held message can be safely recovered. There is deliberately no blind retry button. The manual fallback remains available.

Signed inbound `BAJA`, `STOP`, `CANCELAR`, `UNSUBSCRIBE`, `ALTO` or `SALIR` records a durable suppression. A later checkout checkbox does not override it. Off-channel opt-outs can be recorded by the trusted operator CLI below. Already in-flight/sent messages cannot be recalled. Arbitrary inbound chat content is not stored; customers can use the existing contact route for human assistance. This integration is not an agent inbox: arrange human monitoring/contact handling before launch.

## Configuration required before any real sending

The owner must separately authorize activation. No credentials should be sent in chat, committed, placed in public environment variables, or printed by a command.

1. Create/use a Meta business portfolio, WhatsApp Business Account and Meta application with the WhatsApp product. Complete the identity/business verification and display-name approval required by the account. This is not a purchase of the “Meta Verified” subscription. Production eligibility must be checked in Meta, not inferred from local tests.
2. Select a business-controlled sender number capable of receiving the SMS/voice ownership code and configure two-step verification. A dedicated number is the least disruptive starting option. Do not deregister or migrate the existing bakery WhatsApp number without separate approval and a verified migration/coexistence path. The owner recipient can be different from the sending number.
3. Obtain a suitable server-side system-user token with `whatsapp_business_messaging`; management permissions are needed for account/template/subscription setup. Record WABA ID and phone-number ID. Pin a currently supported Graph API version after verifying it. Unit tests use a deliberately fake version and cannot prove API compatibility.
4. Obtain approval for both utility templates in the configured language, including the exact one-body-parameter mapping and tested full-cart size limit. Discounts are transactional price facts, not marketing copy. Obtain/record the owner's recipient consent. Publish the appropriate privacy notice for customer details shared with Meta and the owner.
5. Configure billing and confirm the rate card for customer and owner destination countries. Verify the customer checkbox/withdrawal flow, and arrange human handling of opt-outs received by phone or other channels.
6. After a separately approved deployment, expose HTTPS `/api/webhooks/whatsapp`, configure the verification secret, subscribe the Meta application/WABA to messages and delivery callbacks, and test signatures and delivery with expressly authorized test recipients. Redact webhook verification query parameters in reverse-proxy/access logs. No public tunnel or endpoint was created here.

Required server variables (actual values supplied privately):

- Existing `WHATSAPP_NOTIFICATIONS_ENABLED`, `WHATSAPP_ACCOUNT_READY`, `WHATSAPP_OWNER_CONSENT_CONFIRMED`.
- New `WHATSAPP_AUTOMATION_AUTHORIZED` and `WHATSAPP_AUTOMATION_CONTRACT_ACK` (exact value above).
- `WHATSAPP_API_VERSION`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_ACCESS_TOKEN`.
- `OWNER_WHATSAPP_DESTINATION` in country-code digits, `WHATSAPP_CUSTOMER_ORDER_TEMPLATE`, `WHATSAPP_OWNER_ORDER_TEMPLATE`, `WHATSAPP_APPROVED_TEMPLATE_LANGUAGE`, `WHATSAPP_TEMPLATE_BODY_MAX_CHARACTERS`.
- `WHATSAPP_SEND_AFTER`: approved go-live timestamp including offset, for example the Guatemala `-06:00` offset. Old orders are blocked, never backfilled automatically.
- `WHATSAPP_MAX_QUEUE_AGE_SECONDS`: explicitly selected freshness limit, no more than 86400 seconds; older events are held.
- Independent inbound gate `WHATSAPP_WEBHOOKS_ENABLED`, plus `WHATSAPP_APP_SECRET` and `WHATSAPP_VERIFY_TOKEN` (at least 32 characters). Keep callbacks/withdrawals available when disabling outbound sending.

All example sending/webhook flags remain **false**. Missing authorization, consent/account readiness, templates, IDs or secrets leaves the worker disabled. `PAYMENTS_ENABLED` remains false; enabling it is still rejected by the existing application. The existing Ticket10 production preflight intentionally still rejects enabled notifications: activation also needs that runtime gate reviewed under separate launch authorization. Configuration alone is not production-readiness proof.

## Local/operator commands

Use an isolated test database for tests. Apply migrations through the existing migration command before exercising the worker. Never point test reset scripts at operational data.

`npm run whatsapp:worker` runs one bounded batch and logs only aggregate outcomes. When disabled it does not open a database connection or send any request. Scheduling repeated batches is future deployment work; no scheduler, server or paid resource was provisioned.

`npm run whatsapp:worker -- --opt-out` reads one country-code number from standard input followed by EOF. It records an off-channel withdrawal without sending. Do not put customer numbers into shared command history or logs. Only a trusted operator with database access should run it.

`npm run whatsapp:worker -- --cleanup` removes callback-inbox receipts older than seven days without enabling sending. Successful enabled batches also perform this cleanup. Schedule cleanup separately if sending stays disabled while callbacks are enabled. Consent/suppression records remain private operational data; include them in the future privacy/retention implementation rather than assuming order anonymization automatically removes every related record.

## Costs and official references

Direct Meta avoids an intermediary's per-message markup; usage is billed by message category and recipient market under Meta's current rate card. Customer order receipts and owner receipts are separate messages. With all customers opted in, 100 orders produce up to 200 initial messages, plus up to 100 future payment confirmations once that feature is verified. Charges depend on actual delivered/billable messages, rates and any applicable discounts. Number/carrier service and future hosting are separate costs.

The current Guatemala utility rate could not be retrieved reliably from Meta's rate-card endpoint during research. No numerical rate or free allowance is promised. Twilio was considered but adds USD0.005 per inbound/outbound message before Meta charges; it is not used by this implementation. Verify pricing again before activation.

Sources checked 2026-10-13: [Meta pricing](https://business.whatsapp.com/products/platform-pricing), [WhatsApp consent and template policy](https://business.whatsapp.com/policy), [official Meta API collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api), [phone registration](https://www.postman.com/meta/whatsapp-business-platform/folder/zuoeksl/registration), [webhook payloads](https://www.postman.com/meta/whatsapp-business-platform/folder/tduohwq/webhook-payload-reference), [Twilio alternative pricing](https://www.twilio.com/en-us/whatsapp/pricing).

## Remaining blockers

No Meta credentials/account eligibility/template approval, live webhook subscription or real-world delivery were verified. No native-device WhatsApp delivery is claimed. Recurrente/Ticket01 remains blocked and Ticket05 has not implemented authoritative payment evidence; future payment events are not dispatched. Complete those external gates and obtain explicit activation/deployment approval before real sending. No other ticket is started automatically.
