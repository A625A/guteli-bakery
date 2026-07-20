# Current Task

Updated: 2026-07-19

## Objective

Complete Milestone 1's static frontend foundation and portable repository evidence. The five Spanish route shells, formatting, linting, type checks, unit tests, browser tests, static export, screenshots, and reports are complete as of 2026-07-19.

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

## Milestone 1 repository deliverables

- Static Spanish-first shells for home, menu, cart, order, and contact
- Portable npm commands and static `out/` preview
- Verified formatting, linting, type, unit, Playwright, build, and direct runtime evidence
- Real 1440×1000 desktop and 390×844 mobile screenshots
- Repository capability and artifact reports

## Acceptance criteria

- No runtime dependency references the external vault or an absolute local path.
- The static application builds into `out/` and its five foundation routes serve locally.
- The Task 4 repository evidence is complete and committed.
- External Obsidian-vault updates remain for the next bounded subtask.
- Task 5 remains the gate for final full verification and independent code review.
