# Güteli Bakery Frontend MVP

Spanish-first, mobile-first bakery catalog and order-request experience for Güteli Bakery in Guatemala.

## Current status

Milestone 1 frontend foundation is formally approved, merged into `main`, and verified from the main checkout. The static Spanish-first shell is available for `/`, `/menu/`, `/cart/`, `/order/`, and `/contact/`; later milestones will implement the customer experience behind those routes. Milestone 2 awaits explicit user approval.

The repository evidence was verified on 2026-07-19. No deployment occurred, and public deployment remains out of scope.

## Local requirements and commands

- Node.js `^20.9.0 || >=22.0.0`
- npm `>=10.0.0`

Install dependencies with `npm install`, then use these verified commands:

```bash
npm run dev
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e:install
npm run test:e2e
npm run build
npm run start
```

`npm run start` serves the previously built static `out/` directory at `http://127.0.0.1:3000`; run `npm run build` first. Browser verification requires a local process that can bind that loopback port.

## Approved MVP

- Responsive home, menu, cart, order, and contact experiences
- Browser-based cart with editable quantities and subtotal in GTQ
- Pickup or delivery selection
- Two-day advance-order validation in Guatemala local time
- Spanish order summary, copy fallback, and WhatsApp click-to-chat handoff
- Human confirmation and clear order-request disclaimers

The MVP excludes databases, backend persistence, authentication, inventory, payment processing, a CMS, analytics accounts, a real WhatsApp API, and public deployment.

## Governance

- Engineering handbook: [`AI/AI-EOS`](AI/AI-EOS/00_START_HERE.md)
- Active scope: [`AI/AI-EOS/CURRENT_TASK.md`](AI/AI-EOS/CURRENT_TASK.md)
- Capability audit: [`AI/AI-EOS/CAPABILITY_TABLE.md`](AI/AI-EOS/CAPABILITY_TABLE.md)
- Proposed structure: [`docs/PROPOSED_FILE_STRUCTURE.md`](docs/PROPOSED_FILE_STRUCTURE.md)
- Milestones: [`docs/MILESTONES.md`](docs/MILESTONES.md)
- Evidence: [`artifacts/README.md`](artifacts/README.md)

Long-term project memory is maintained in the external Obsidian folder `Phase 2 - Guteli Demo`. The application never depends on that vault at build time or runtime. The Milestone 1 approval and merge notes are synchronized and validated, while Milestone 2 awaits explicit user approval.
