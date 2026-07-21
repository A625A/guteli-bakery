# Current Task

Updated: 2026-07-21

## Objective

Milestones 0, 1, 2, and 3 are complete and formally approved. Milestone 4 is a completed visual candidate on `milestone-4-brand-refinement` at code HEAD `7e33af8`, awaiting user approval. It has not been merged, tagged, pushed, or deployed. The approval checkpoint is limited to visual review of this candidate; public deployment and any larger follow-on system remain unauthorized.

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

## Milestone 4 completed visual candidate

- The official logo is a lossless 864×240 JPEG crop from `assets/reference/guteli-brand-reference.jpeg`, whose verified SHA-256 is `4af05f831029c5d07f835c9cea51d510956f5e5beaa5e46bc1e30bf7b0a1d194`.
- The crop command geometry is exactly `864x240+160+48`; `public/brand/guteli-logo-original.jpeg` contains the original GÜTELI BAKERY wordmark, pretzel-heart symbol, original colors, and surrounding dark field, with no product photography, menu copy, phone number, or slogan.
- The logo pixels were not redrawn, traced, recolored, sharpened, simplified, or distorted. The same proportional asset appears in the header and footer.
- The homepage renders the exact approved slogan once and separately from the logo: `Buenos momentos empiezan con algo recién horneado.`
- Default demo mode renders the exact banner `Sitio demo — ninguna solicitud se envía.` and no active `wa.me` link.
- Customer-facing cart language is now `Canasta`; menu additions, empty state, summary copy feedback, category labels, basket motifs, and responsive brand chrome use the restrained bakery-specific treatment.
- Fourteen tracked Milestone 4 PNGs cover desktop, mobile, validation, demo-handoff, logo, banner, and footer states. The required six were inspected at original resolution; all ten Milestone 3 PNG hashes remain unchanged.
- Initial whole-branch review found one Important unofficial hero wordmark. Commit `7e33af8` removed `.home-hero__wordmark` with RED/GREEN coverage, used the neutral label `Selección ilustrada`, and refreshed only the two homepage screenshots.
- Follow-up whole-branch review found no Critical, Important, or Minor finding and returned **Ready for visual approval**.

## Acceptance criteria

- The real confirmed menu is visible and cart add, update, remove, subtotal, and invalid-persistence recovery work.
- The order form enforces required information and the Guatemala-local two-day rule.
- Spanish summary, copy fallback, WhatsApp URL, and handoff fallback work without automatic sending or confirmation claims.
- The complete journey works on desktop and mobile with keyboard access, visible focus, no horizontal overflow, and no browser-console errors.
- All required npm checks, static build, local preview, screenshots, reports, and independent review pass with no Critical or Important findings.
- No runtime dependency references the external vault, absolute local paths, secrets, or unauthorized infrastructure.

## Milestone 2 verification checkpoint — 2026-07-21

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

## Milestone 3 merged-main verification — 2026-07-21

- `main` fast-forwarded from `a0324b9` to the complete Milestone 3 history without squashing or a merge commit.
- `npm install`, `npm run format:check`, `npm run lint`, and `npm run typecheck` passed from merged `main`.
- `npm test`: 6 files and 40 tests passed.
- `npm run test:e2e`: all 59 default-demo Chromium tests passed, including the complete order journey, copy success/fallback, zero captured console errors, responsive overflow checks, and artifact recapture.
- `npm run test:e2e:live` and `npm run test:e2e:unavailable`: one test each passed, proving the confirmed live destination and fail-closed unapproved destination.
- `npm run build` produced the six expected static routes. `npm run start` served the final default export; `/`, `/menu/`, `/cart/`, `/order/`, and `/contact/` each returned HTTP 200.
- The final default export contains the demo notice and no exact live/test destination, flyer reference, or removed customer-facing caption.
- All ten Milestone 3 screenshots and the portfolio case study remain present and tracked.

## Milestone 4 final candidate verification — 2026-07-21

- `npm install`: PASS; dependency graph already up to date.
- `npm run format:check`, `npm run lint`, and `npm run typecheck`: PASS.
- `npm test`: PASS — 6 files and 40 tests.
- The first sandboxed Playwright launch failed before tests with `listen EPERM 127.0.0.1:3000`; systematic debugging identified sandbox port denial, and the permitted rerun exercised real browser behavior.
- `npm run test:e2e`: PASS — 60/60 Chromium tests.
- `npm run test:e2e:live`: PASS — 1/1 confirmed destination.
- `npm run test:e2e:unavailable`: PASS — 1/1 unapproved destination fails closed.
- `npm run build`: PASS — `/`, `/_not-found`, `/cart`, `/contact`, `/menu`, and `/order` statically generated.
- `npm run start`: PASS — `/`, `/menu/`, `/cart/`, `/order/`, and `/contact/` each returned HTTP 200; server stopped cleanly.
- Default export: exact slogan and demo banner present; no active `href="https://wa.me/"`, unapproved test destination, flyer reference, removed `.home-hero__wordmark`, or removed caption. The confirmed public destination may remain in configuration but creates no active demo link.
- Artifact evidence: 14 tracked Milestone 4 PNGs; required six inspected at original resolution; no overflow, clipping, logo distortion, or product photography; all ten Milestone 3 PNG hashes preserved.
- Follow-up whole-branch review: Ready for visual approval with no Critical, Important, or Minor finding.

## Non-blocking pre-deployment refinements

- Prepare a shorter client-facing portfolio case-study version.
- Replace illustrations with authentic product photography only when approved images become available.

## Pending gate

- Obtain explicit user visual approval before merging, tagging, pushing, or deploying Milestone 4.
- Obtain separate authorization before any public deployment.
- Do not begin a WhatsApp bot, backend, payments, CMS, inventory system, authentication, or another large milestone without explicit approval.
