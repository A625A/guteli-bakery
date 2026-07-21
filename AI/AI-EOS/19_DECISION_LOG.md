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

## 2026-07-19 — Milestone 1 formally approved and merged

**Context:** The frontend foundation completed its implementation plan, TDD checks, real runtime evidence, independent review, and pre-merge verification with no Critical or Important findings.

**Decision:** Formally approve Milestone 1 and merge `milestone-1-foundation` into `main` using a fast-forward-only merge. Preserve every feature-branch commit; do not squash, push, deploy, or start Milestone 2.

**Result:** `main` contains the complete Milestone 1 history. Verification from `main` passed dependency installation, formatting, lint, type generation and TypeScript, three unit tests, nine Chromium tests, static export, and an HTTP 200 production preview. A worktree-portability regression was fixed with RED/GREEN coverage, and an empty untracked legacy `app/` directory was removed so Next.js resolves the approved `src/app/` tree. Milestone 2 remains gated on explicit user approval.

## 2026-07-21 — Consolidated Milestone 2 working MVP

**Decision:** Replace the former separate homepage/menu, cart, order-handoff, and final-quality milestones with one authorized Milestone 2 that delivers the complete usable customer journey and proportional evidence.

**Result:** The approved foundation remains intact. Milestone 2 may implement the complete static customer experience, but no public deployment, backend, payment integration, WhatsApp bot/API, CMS, authentication, inventory system, or multi-tenant platform is authorized.

## 2026-07-21 — Original-logo provenance and separation

**Context:** Milestone 4 required the supplied original logo without recreating or simplifying it, while retaining a separate approved slogan and the graphic-only product-art policy.

**Decision:** Use `assets/reference/guteli-brand-reference.jpeg` at verified SHA-256 `4af05f831029c5d07f835c9cea51d510956f5e5beaa5e46bc1e30bf7b0a1d194` as the canonical source. Create `public/brand/guteli-logo-original.jpeg` only through the lossless crop geometry `864x240+160+48`. Preserve the original GÜTELI BAKERY wordmark, pretzel-heart symbol, colors, proportions, and dark field; do not redraw, trace, recolor, sharpen, simplify, or distort it. Keep the exact slogan `Buenos momentos empiezan con algo recién horneado.` as separate homepage text.

**Result:** Header and footer share the proportional original-logo crop. The crop contains no flyer product photography, menu copy, phone number, or slogan. The reviewed hero no longer contains the unofficial `.home-hero__wordmark`; `Selección ilustrada` is a neutral editorial label, not a replacement logo.

## 2026-07-21 — Milestone 4 visual-candidate gate

**Decision:** Preserve `milestone-4-brand-refinement` as a completed visual candidate awaiting explicit user approval. Do not merge, tag, push, deploy, or begin another milestone at this gate.

**Result:** The final gate passed 40 unit tests, 60 default Chromium tests, the separate confirmed-live and unavailable tests, static export, five-route HTTP preview, bundle-safety inspection, screenshot integrity, and follow-up whole-branch review. The review verdict is Ready for visual approval with no Critical, Important, or Minor finding.
