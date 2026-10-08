# Güteli Bakery

Vocabulary for the bakery's order workflow. Payment and capacity terms describe the proposed commercial workflow; their implementation and business policies await approval.

## Language

**Order request**: A customer's saved request for products on a requested date. Receipt of a request does not establish payment or acceptance for production.
_Avoid_: Paid order, confirmed order

**Order**: The durable record of requested products, customer details, fulfillment arrangements, amounts, and operational progress.

**Confirmed order**: An order accepted for production. In the proposed prepaid workflow, confirmation requires verified payment and committed production capacity.

**Verified payment**: A payment whose provider record establishes the correct order association, amount, currency, and successful collection. A payment link, screenshot, or customer message is not verification.

**Settlement**: Transfer of collected funds from the payment provider to the bakery's bank account. Settlement is distinct from the customer's payment succeeding.

**Sale unit**: The purchasable quantity of a product, such as a bag of five pretzels. One sale unit need not equal one individual baked piece.

**Production unit**: A proposed measure of the work needed to produce a sale unit. Its weight is a bakery decision, not a price or a physical stock count.

**Production date**: The date against which the bakery budgets production capacity. Whether it equals the requested fulfillment date remains an owner decision.

**Capacity reservation**: A temporary claim against a production date while checkout or payment is unresolved. It becomes a committed allocation on confirmation or is released only when release is safe.

**Closed date**: A date on which the bakery accepts no new production allocations. Closing a date does not silently cancel existing commitments.

**Delivery quote**: The bakery's proposed delivery charge and resulting complete order total, awaiting customer acceptance before payment.

**WhatsApp handoff**: Opening a chat with a prepared order message. The customer must press Send; opening the chat does not establish message delivery or payment.
