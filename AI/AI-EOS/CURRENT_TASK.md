# Current Task

Updated: 2026-07-21

## Objective

Milestones 0 and 1 are complete, approved, committed, tagged, merged where applicable, and verified. Milestone 2 is authorized as one implementation milestone that must deliver the complete working customer-facing website MVP. No public deployment is authorized.

## Approved product scope

- Responsive homepage and complete menu
- Product selection and browser cart
- Editable quantities and subtotal in Guatemalan quetzales
- Pickup or delivery selection
- Customer information form
- Guatemala-local two-day advance-order validation
- Readable Spanish order summary
- Copyable summary fallback
- WhatsApp click-to-chat handoff
- Contact information and clear order-request disclaimer
- Empty, validation-error, and fallback states

## Explicit exclusions

- Database or backend order persistence
- Authentication, customer accounts, or admin dashboard
- Inventory management
- Real WhatsApp API or bot
- Payment processing or webhooks
- Automatic delivery pricing
- CMS
- Analytics requiring external accounts
- Multi-tenant infrastructure
- Public deployment

## Unresolved business information

- Pickup address
- Operating hours
- Delivery zones
- Exact bagel quantities
- Exact burger-bun quantities
- Accepted payment methods
- Whether every displayed price is final or subject to confirmation

Approved safe copy includes:

- “Cantidad por confirmar” only where necessary
- “Costo de envío por confirmar según ubicación”
- “El pedido queda sujeto a confirmación por WhatsApp”
- “Solicita información de recogida por WhatsApp”

Pretzels use “bolsa de 5” and nuditos use “bolsa de 15.” Other quantity fields remain optional in typed menu data.

## Milestone 2 authorized deliverables

- Complete responsive homepage, menu, cart, order, and contact experiences
- Centralized typed confirmed menu content without invented facts
- Browser-local cart persistence for product IDs and quantities only
- Pickup or delivery selection, customer form, and Guatemala-local two-day date validation
- Readable and copyable Spanish order summary
- User-controlled WhatsApp click-to-chat handoff with visible fallback
- Real desktop and mobile screenshots of the homepage and complete order journey
- Proportional build, test, accessibility, visual, preview, and release evidence

## Acceptance criteria

- The real confirmed menu is visible and cart add, update, remove, subtotal, and invalid-persistence recovery work.
- The order form enforces required information and the Guatemala-local two-day rule.
- Spanish summary, copy fallback, WhatsApp URL, and handoff fallback work without automatic sending or confirmation claims.
- The complete journey works on desktop and mobile with keyboard access, visible focus, no horizontal overflow, and no browser-console errors.
- All required npm checks, static build, local preview, screenshots, reports, and independent review pass with no Critical or Important findings.
- No runtime dependency references the external vault, absolute local paths, secrets, or unauthorized infrastructure.
