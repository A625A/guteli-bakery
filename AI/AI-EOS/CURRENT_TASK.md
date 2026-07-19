# Current Task

Updated: 2026-07-19

## Objective

Prepare the approved Güteli Bakery frontend MVP for implementation by completing Milestone 0 governance, documentation, capability inspection, artifact structure, portability rules, and repository cleanup.

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

## Milestone 0 deliverables

- Canonical `AI/AI-EOS` and decision log
- Phase 2 Obsidian documentation
- Capability table
- Artifact evidence structure
- Correct `.gitignore` and safe repository cleanup
- Project-relative brand reference
- Exact proposed frontend structure and milestone sequence

## Acceptance criteria

- No competing AI-EOS directory remains.
- The canonical handbook contains all original information plus project-specific context.
- All requested Obsidian notes exist and use wikilinks.
- No application runtime dependency references the Empresita vault or an absolute local path.
- No production frontend is initialized.
- Milestone 1 remains blocked until explicit approval.
