# Güteli Bakery Frontend MVP

Spanish-first, mobile-first bakery catalog and order-request experience for Güteli Bakery in Guatemala.

## Current status

Milestone 0 is complete: project governance, requirements, documentation, artifacts, and the proposed structure are established. Frontend initialization is intentionally blocked until Milestone 0 receives user approval.

No application runtime or verified `npm` commands exist yet. Milestone 1 will initialize the selected frontend framework and document only the commands that are actually configured and tested.

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

Long-term project memory is maintained in the external Obsidian folder `Phase 2 - Guteli Demo`. The application must never depend on that vault at build time or runtime.
