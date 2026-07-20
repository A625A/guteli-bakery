# Current Task

Updated: 2026-07-19

## Objective

Milestone 1 is formally approved and merged into `main` as of 2026-07-19. The complete feature-branch history was preserved through a fast-forward merge, and the required install, lint, typecheck, unit, browser, build, and local-preview checks passed from `main`. Milestone 2 remains blocked until explicit user approval. No deployment is authorized.

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
- Formally approved Milestone 1 checkpoint on `main`

## Acceptance criteria

- No runtime dependency references the external vault or an absolute local path.
- The static application builds into `out/` and its five foundation routes serve locally.
- The Task 4 repository evidence is complete and committed.
- The three external Obsidian-vault evidence notes are synchronized and all 19 Phase 2 notes and 69 wikilinks are validated.
- Milestone 1 is merged, documented, and verified from `main`; Milestone 2 requires explicit user approval before work begins.
