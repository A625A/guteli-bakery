# Implementation Evidence

This directory stores evidence captured from the actual running application.

## Rules

- Screenshots must come from the running application, never from mockups presented as evidence.
- Reports must include commands, dates, results, and unresolved issues.
- A report marked `Not run` is a placeholder, not evidence.
- Public deployment is not authorized.

## Milestone status

- Milestone 0: formally approved on 2026-07-19; governance and artifact structure established.
- Milestone 1: formally approved and fast-forwarded into `main` on 2026-07-19 with complete commit history preserved; merged-main verification passed.
- Milestone 1 screenshots: `screenshots/desktop/milestone-1-foundation.png` (1440×1000) and `screenshots/mobile/milestone-1-foundation.png` (390×844), both captured from the running root route and visually inspected.
- Milestone 2: formally approved and fast-forwarded into `main` on 2026-07-21 with complete commit history preserved; merged-main verification passed.
- Milestone 2 desktop: `screenshots/desktop/milestone-2-homepage.png`, `screenshots/desktop/milestone-2-cart.png`, and `screenshots/desktop/milestone-2-summary.png`, captured full-page from a 1440×1000 viewport.
- Milestone 2 mobile: `screenshots/mobile/milestone-2-homepage.png`, `screenshots/mobile/milestone-2-cart.png`, and `screenshots/mobile/milestone-2-summary.png`, captured full-page from a 390×844 viewport.
- Milestone 2 interaction state: `screenshots/interaction-states/milestone-2-validation.png`, captured full-page from a 1440×1000 viewport with a focused one-field validation summary.
- Milestone 3: formally approved and fast-forwarded into `main` on 2026-07-21 with all 11 commits preserved; merged-main verification passed.
- Milestone 3 desktop: `screenshots/desktop/milestone-3-homepage.png`, `milestone-3-menu.png`, `milestone-3-cart.png`, and `milestone-3-summary.png`, captured full-page from a 1440×1000 viewport.
- Milestone 3 mobile: `screenshots/mobile/milestone-3-homepage.png`, `milestone-3-menu.png`, `milestone-3-cart.png`, and `milestone-3-summary.png`, captured full-page from a 390×844 viewport.
- Milestone 3 interaction states: `screenshots/interaction-states/milestone-3-validation.png` and `milestone-3-demo-handoff.png`, captured full-page from a 1440×1000 viewport.
- Portfolio case study: `portfolio/guteli-bakery-case-study.md` documents the verified problem, solution, journey, demo-safety model, technical approach, limitations, and real screenshots.
- Reports: build, tests, accessibility, performance, visual review, preview, and release-summary contain separately labelled Milestone 1, Milestone 2, and Milestone 3 evidence.
- Public deployment: not authorized.

The final Milestone 2 independent follow-up review found no Critical or Important issue. One Minor quantity-input UX refinement remains non-blocking.

The focused Milestone 3 follow-up review found no Critical or Important issue and returned Ready for visual approval. Its only Minor documentation omission was corrected before the final evidence commit.

The external Phase 2 Obsidian project-memory notes are synchronized through Milestone 3 formal approval and merged-main verification. Frontmatter and internal wikilinks remain valid. Milestones 1, 2, and 3 are approved, merged, and verified from `main`. This remains a private repository artifact, not a public deployment. The earlier moderate PostCSS advisory remains open; Milestone 3 did not rerun the dependency audit.

Non-blocking pre-deployment refinements: shorten the mobile demo banner, review mobile footer density, prepare a shorter client-facing case study, and replace illustrations only when approved authentic product photographs become available.
