# Ticket09 extension: automatic customer and owner messages

Approved 2026-10-13: direct Meta Cloud API, customer order-received messages only with explicit unchecked checkout opt-in, plus a separately configured owner order notification. No marketing/reminders. Manual previews/copy stay available. Payments, real sending and deployment remain disabled. Owner authorized scoped commits and ordinary pushes to A625A/guteli-bakery/main. Preserve products/ and other worktrees; never access Oracle or hackathon infrastructure.

## Contract

- Saving an order atomically records consent evidence and unique outbox events. Existing owner events are reused. Replays cannot create duplicate events or silently change consent. No network requests in checkout transactions.
- Customer consent names Güteli and order/payment updates, applies to the checkout number, defaults off and can be withdrawn through BAJA/STOP or direct contact. Eight-digit local numbers mean Guatemala (+502); international numbers require an explicit + prefix. Invalid WhatsApp numbers must not break non-opted-in checkout.
- Order receipt means request saved, not production acceptance or payment. Unpaid/pending labels are explicit and never claim verified collection. PAID/REFUNDED enums alone are unverified. Future payment-confirmation event types fail closed until Ticket05 supplies authoritative evidence; no browser/admin enum can trigger them now.
- Worker reuses pricing review under catalog/order locks, captures coherent current pricing and preserves paid markers' immutable amounts. Messages include products/units, base/effective prices, promotions/discounts, shipping uncertainty, final total, reference, date and required customer details. Timestamped unpaid totals can change. No silent truncation to fit a template.
- Separate customer/owner templates must be approved as utility templates with exact parameter mapping and verified size limits. A body-only text parameter is flattened to one line; an oversized payload is blocked with the existing manual fallback. Approval/fit for the maximum cart is an external activation gate, not assumed success.
- Reuse outbox durability with unique event keys, atomic worker claims and bounded exponential retry only for definitive rate-limit rejection. Ambiguous network/timeout/5xx/invalid accepted response or a crashed in-flight worker is held for reconciliation, never blind replay. Exactly-once provider delivery is not promised.
- Signed, bounded webhooks validate account, sender and recipient. Delivery states are monotonic and idempotent; late callbacks cannot downgrade delivered/read. Authenticated STOP/BAJA suppresses future sends; a later checkout checkbox does not silently override suppression.
- No raw webhook bodies, full message text, tokens or personal data in logs. Credentials remain server-only. Sending requires explicit flags, a complete configuration and a go-live cutoff so old disabled-period orders are never automatically replayed. A local CLI runs one bounded batch; scheduling/hosting is outside this ticket.

## Test seams

User-requested seams: request/consent validation, transactional order/outbox creation against isolated PostgreSQL, processor/provider HTTP boundary, signature/recipient/status webhook boundary, and desktop/mobile checkout and manual-summary browser flows. Observe failing tests before each implementation slice. Mock only external network delivery and do not claim real delivery from fixtures.

## Sources and unresolved external checks

Checked 2026-10-13: [Meta policy](https://business.whatsapp.com/policy), [Meta pricing](https://business.whatsapp.com/products/platform-pricing), [official Meta API collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api), [phone registration](https://www.postman.com/meta/whatsapp-business-platform/folder/zuoeksl/registration), [webhook structure](https://www.postman.com/meta/whatsapp-business-platform/folder/tduohwq/webhook-payload-reference), [Twilio pricing comparison](https://www.twilio.com/en-us/whatsapp/pricing).

Direct Meta avoids Twilio's additional USD0.005/message handling fee. Exact current Guatemala utility rates could not be independently retrieved from Meta's rate-card endpoint; do not invent a number or promise free service messages. Account eligibility/business verification, phone ownership/registration, current Graph version, templates and full-cart fit, rate card, HTTPS callback subscription and end-to-end delivery must be verified before activation. No account access or setup is authorized in this task.
