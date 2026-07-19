# Guteli Bakery – Master Prompt for Codex / Claude Code

> This document is the master system prompt for building the Guteli Bakery demo as Phase 2 of the Guatemala conversational commerce business.

## High-Level Objective

Build a production-quality demonstration project that showcases a small business website integrated with a future WhatsApp ordering workflow.

The business knowledge lives in:

`/Users/andrewarana/Desktop/Empresita`

The application code lives in:

`/Users/andrewarana/Desktop/Guteli Bakery`

The application must be portable and never depend on absolute paths.

---

# Before writing code

1. Inspect the Empresita Obsidian vault.
2. Read the final Phase 1 notes (Business Definition, Service Catalog, Scope Boundaries, Tool Stack, Payment Decision, etc.).
3. Summarize the important findings.
4. Create a new Obsidian folder named **Phase 2 - Guteli Demo** and maintain documentation throughout development.
5. Create long-term project memory (Current State, Decisions, Learnings, Session Log, Scenario Guide, Roadmap, Requirements, Architecture).

---

# Brand Reference

Reference image:

`/Users/andrewarana/Desktop/Guteli Bakery/Guteli.jpeg`

Use it only as inspiration for:
- Brand
- Logo direction
- Menu
- Prices
- Contact number
- Color palette

Do NOT reproduce the flyer layout.

---

# Development Phases

## Phase 1 (Only build this now)

Create:

- Beautiful responsive bakery website
- Home
- Menu
- Contact
- Shopping cart
- Order form
- Pickup / delivery
- WhatsApp click-to-chat handoff
- Readable order summary
- Demo disclaimer

Do NOT build:

- Real WhatsApp Cloud API
- Real chatbot
- Payment processing
- Database
- Inventory
- Admin panel

Prepare the architecture for those features.

---

## Future phases

Phase 2
- Backend
- Stored draft orders
- Order IDs
- WhatsApp bot detects website orders

Phase 3
- WhatsApp-first ordering
- Interactive menu

Phase 4
- Hosted payment links
- Payment webhooks
- Automatic confirmations

---

# UI Philosophy

The site must NOT look AI generated.

Avoid:
- Glassmorphism
- Random gradients
- SaaS dashboards
- Generic templates
- AI slop

Instead create:

- Editorial typography
- Warm bakery colors
- Professional spacing
- Excellent mobile UX
- Accessible design
- Easy future editing

---

# Technical Guidelines

Prefer:

- TypeScript
- Modern React framework (Next.js acceptable)
- Component architecture
- Central menu data
- Relative paths
- Strong typing
- Unit tests
- Clean documentation

No unnecessary complexity.

---

# Obsidian Memory

Maintain notes for:

- Context
- Decisions
- Learnings
- Scenario Guide
- Current State
- Session Log
- Architecture
- Roadmap
- Requirements

Update them after every meaningful work session.

---

# Scenario Guide

Document how the architecture changes if:

- Menu changes frequently
- Client wants CMS
- Client wants inventory
- Client wants WhatsApp-only
- Client wants ecommerce
- Payment provider changes
- High order volume
- Low order volume
- Multiple clients
- Brand redesign

---

# Testing

Run:

- formatter
- linter
- type checker
- unit tests
- production build

Never claim success without showing results.

---

# Workflow

1. Inspect project.
2. Read Phase 1.
3. Produce architecture proposal.
4. Wait for approval.
5. Build Phase 1 incrementally.
6. Test continuously.
7. Review UI.
8. Update documentation.
9. Stop after Phase 1.

