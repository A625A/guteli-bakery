# Güteli Bakery

Vocabulary for the bakery's order workflow. Payment terms describe the proposed commercial workflow. Automated production-capacity management was excluded by the owner; existing requested-date scheduling remains.

## Language

**Order request**: A customer's saved request for products on a requested date. Receipt of a request does not establish payment or acceptance for production.
_Avoid_: Paid order, confirmed order

**Order**: The durable record of requested products, customer details, fulfillment arrangements, amounts, and operational progress.

**Confirmed order**: An order accepted for production. In the proposed prepaid workflow, confirmation requires verified payment; automated production-capacity reservation is not part of the current scope.

**Verified payment**: A payment whose provider record establishes the correct order association, amount, currency, and successful collection. A payment link, screenshot, or customer message is not verification.

**Settlement**: Transfer of collected funds from the payment provider to the bakery's bank account. Settlement is distinct from the customer's payment succeeding.

**Sale unit**: The purchasable quantity of a product, such as a bag of five pretzels. One sale unit need not equal one individual baked piece.

**Requested fulfillment date**: The date the customer requests pickup or delivery, subject to the existing advance-order rule. It does not reserve a production slot or consume a daily capacity budget.

**Delivery quote**: The bakery's proposed delivery charge and resulting complete order total, awaiting customer acceptance before payment.

**Promotion**: A percentage discount valid only for its defined interval in the bakery's Guatemala business timezone. An unpaid request does not preserve an expired promotion.

**Promotion scope**: Either the entire catalog or an explicit set of one or more products. If multiple enabled promotions are valid for a product, only the highest discount applies.

**Current checkout price**: The current catalog and active promotion amount for an unpaid request's quantities, plus applicable delivery. A changed amount needs renewed customer acceptance.

**Paid pricing snapshot**: The exact amount and item-level pricing supported by a successfully verified payment. Later catalog changes, promotions or refunds do not rewrite it.

**WhatsApp handoff**: Opening a chat with a prepared order message. The customer must press Send; opening the chat does not establish message delivery or payment.

## Current Ticket02 implementation

The provider-independent dynamic pricing and customer acceptance slice is implemented locally and verified. Pricing revisions preserve history while unpaid orders reprice; paid/refunded markers remain immutable. Promotions support catalog-wide and selected-product scopes, Guatemala schedules, and highest-discount selection. See `docs/implementation/2026-10-07-checkout-progress.md` for evidence and `.scratch/production-readiness/ticket02-checkpoint.md` for the small continuation checkpoint. Ticket01 remains blocked; payment-dependent verification is not implemented. No commits or pushes are authorized for this slice.

**Automatic order receipt**: A business-initiated WhatsApp notification that a request was saved. It is distinct from production acceptance, price approval and verified payment.

**WhatsApp opt-in**: The customer's explicit permission to receive this order's receipt and future verified-payment confirmation at the checkout number. It is optional and revocable.

**Delivery acceptance**: The messaging provider accepted a request and returned an identifier. It does not establish delivery or reading.

**Uncertain delivery**: Sending may have succeeded but no reliable result was recorded. It requires reconciliation before another attempt to avoid duplicate messages.
