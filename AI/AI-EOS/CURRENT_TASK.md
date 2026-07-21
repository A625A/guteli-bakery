# Current Task

Updated: 2026-07-21

## Objective

Milestones 0, 1, and 2 are complete and formally approved. Milestone 3 portfolio polish is implemented and locally verified on the isolated `milestone-3-portfolio-polish` branch. It is not approved, merged, pushed, tagged, or deployed; user visual approval is the next gate.

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

## Milestone 2 delivered candidate

- Complete responsive homepage, menu, cart, order, and contact experiences
- Centralized typed confirmed menu content without invented facts
- Browser-local cart persistence for product IDs and quantities only
- Pickup or delivery selection, customer form, and Guatemala-local two-day date validation
- Readable and copyable Spanish order summary
- User-controlled WhatsApp click-to-chat handoff with visible fallback
- Real desktop and mobile screenshots of the homepage and complete order journey
- Proportional build, test, accessibility, visual, preview, and release evidence

## Milestone 3 verified candidate

- Original graphic-only editorial homepage using typography and SVG/CSS bakery forms
- Code-rendered compact brand mark; the photo-bearing reference flyer is absent from the customer bundle
- Eight clearly labelled category-illustration slots sized for later authentic photography
- Polished responsive menu, cart, form, validation, summary, copy, and contact states
- Visible default demo banner with no active WhatsApp destination
- Explicit live mode restricted to the confirmed `50242569861` destination; all other destinations fail closed
- Separate live and unavailable browser configuration tests
- Ten real runtime screenshots and a standalone portfolio case study
- Independent review findings addressed in commit `7c78b70`
- Focused follow-up review: Ready for visual approval, with no Critical or Important finding remaining

## Acceptance criteria

- The real confirmed menu is visible and cart add, update, remove, subtotal, and invalid-persistence recovery work.
- The order form enforces required information and the Guatemala-local two-day rule.
- Spanish summary, copy fallback, WhatsApp URL, and handoff fallback work without automatic sending or confirmation claims.
- The complete journey works on desktop and mobile with keyboard access, visible focus, no horizontal overflow, and no browser-console errors.
- All required npm checks, static build, local preview, screenshots, reports, and independent review pass with no Critical or Important findings.
- No runtime dependency references the external vault, absolute local paths, secrets, or unauthorized infrastructure.

## Verification checkpoint — 2026-07-21

- `npm install`, formatting, lint, route type generation plus TypeScript, and the static build passed.
- `npm test`: 5 files and 27 tests passed.
- `npm run test:e2e`: 49 Chromium tests passed, including real desktop/mobile artifact capture and fail-first review regressions.
- `npm run start` served `out/`; `/`, `/menu/`, `/cart/`, `/order/`, and `/contact/` each returned HTTP 200.
- Seven real screenshots were recaptured by the final browser run and remained byte-identical to the inspected evidence.
- Initial independent review reported no Critical findings and four Important findings. Pre-hydration cart loss, persistent mobile navigation, stale reviewed handoff data, Guatemala-midnight date drift, and stale evidence were addressed with regression evidence where applicable.
- Independent follow-up review verdict: Ready to merge, with no Critical or Important finding remaining. One Minor quantity-input UX refinement is non-blocking.
- Formal approval was received. `finishing-a-development-branch` option 1 fast-forwarded `main` to the complete Milestone 2 history without squashing.
- Merged-main verification passed `npm install`, format check, lint, typecheck, 27 unit tests, 49 browser tests, static build, and HTTP 200 on all five customer routes.
- Private GitHub `main` was pushed and remote SHA parity was verified. Public deployment and later milestones remain blocked.

## Pending gate

- Obtain user visual approval before any Milestone 3 integration action.
- Do not merge, push, tag, or deploy until separately authorized.
