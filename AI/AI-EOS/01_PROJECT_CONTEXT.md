# Project Context

## Goal

Build a production-quality frontend demonstration for Güteli Bakery that turns a Spanish-language menu into a structured WhatsApp order request.

## Success criteria

- A customer can browse the menu, edit a browser cart, choose pickup or delivery, enter required details, and generate a readable Spanish summary.
- The interface enforces the confirmed two-day advance-order rule using Guatemala-local dates.
- WhatsApp handoff and a copyable fallback work without a backend.
- Unresolved business information is disclosed safely and never invented.
- Desktop, mobile, keyboard, accessibility, visual, test, and build evidence is captured from the running application.

## Constraints

- Spanish-first customer experience and GTQ currency.
- Frontend only: no database, persistence API, authentication, admin, inventory, payments, CMS, external analytics, bot, or automatic delivery pricing.
- Portable repository with no machine-specific paths, secrets, or runtime vault dependency.
- Public deployment requires separate approval.

## Stakeholders

- Güteli Bakery operator, who confirms orders and maintains business facts.
- Bakery customers using mobile web and WhatsApp.
- Andrew, project owner and implementer.

## Roadmap

Milestones 0–5 are defined in `docs/MILESTONES.md`. Only Milestone 0 is currently approved.

## Assumptions

- Order requests remain subject to human confirmation.
- Cart state may persist locally; customer personal information will not.
- The visible phone number is used only after its international WhatsApp format is confirmed during implementation.
