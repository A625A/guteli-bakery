# Decision Log

Append-only record of project-level engineering decisions.

## 2026-07-19 — Canonical AI-EOS location

**Context:** The handbook was nested under a template directory, which conflicted with the approved canonical path and created the risk of competing instruction sets.

**Decision:** Preserve and verify every original handbook document, place the complete set at `AI/AI-EOS`, include the bootstrap prompt there, update references, and remove the redundant template nesting after verification.

**Result:** `AI/AI-EOS` is the only governing handbook. `CURRENT_TASK.md` holds active scope; this file records append-only decisions.

## 2026-07-19 — Static frontend boundary

**Decision:** Implement the approved MVP as a Spanish-first, statically deployable TypeScript/React application with browser cart state and a WhatsApp handoff. No backend, database, CMS, payment, inventory, external analytics, authentication, or bot is included.

## 2026-07-19 — Unresolved business information

**Decision:** Missing Güteli facts remain optional configuration fields and are represented with approved confirmation wording. No fictional fulfillment, schedule, delivery, inventory, payment, or pricing promises are allowed.

## 2026-07-19 — Documentation portability

**Decision:** Project memory is maintained in the external Obsidian vault, but repository builds and runtime behavior must remain fully independent of it. The brand reference is copied into a project-relative asset location.

## 2026-07-19 — Milestone 0 formally approved

**Context:** Milestone 0 completed the governance, documentation, architecture, portability safeguards, artifact structure, capability audit, repository cleanup, and Phase 2 knowledge base required before frontend initialization.

**Decision:** Milestone 0 is formally approved. Preserve it as the Git commit `feat(ai-eos): establish engineering operating system and project governance` and tag that commit `milestone-0-approved` before beginning Milestone 1.

**Result:** Milestone 1 is authorized for the frontend foundation only. Finished homepage, menu, cart, ordering, WhatsApp functionality, and public deployment remain outside this milestone.
