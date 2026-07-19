# Business Context

## Venture context

The broader venture is a productized website-and-workflow service for Guatemalan small businesses. Güteli is the Phase 2 demonstration of the catalog and order-request pattern, not a generic chatbot or full ecommerce project.

## Güteli customer

A mobile customer who wants to understand the bakery menu, assemble a request, and send complete information through WhatsApp without a long back-and-forth conversation.

## Service model

```text
Website discovery
→ menu and cart
→ pickup or delivery request
→ customer details
→ readable WhatsApp summary
→ human bakery confirmation
```

## Confirmed source facts

- Pretzels are sold in bags of 5.
- Nuditos are sold in bags of 15.
- The source flyer lists the WhatsApp number `4256-9861`.
- Orders require two days of advance notice.
- Delivery costs extra depending on location.

## Unresolved facts

- Pickup address and operating hours
- Delivery zones
- Exact bagel and burger-bun quantities
- Accepted payment methods
- Whether every displayed price is final or subject to confirmation

These values must remain optional in menu or business configuration and must use approved confirmation wording in the UI.

## Maintenance and scale

The first version uses typed local content. A CMS, inventory system, backend, or multi-client platform is considered only after a real business trigger and separate approval.
