# Release Summary

## Milestone 3 approved integration — 2026-07-21

Status: **Formally approved, fast-forwarded into `main`, and verified from the merged main checkout. Public deployment remains unauthorized.**

The candidate replaces the photo-led flyer treatment with an original graphic-only editorial system, preserves the confirmed menu and order-request journey, and keeps stable illustrative media slots ready for future authentic photography. The customer interface contains no flyer product photography, fake product photography, or “Referencia original de la marca” caption.

Default portfolio mode is fail-safe: it visibly identifies itself as a demonstration, renders no `wa.me` destination, and preserves review/copy fallback. Explicit live mode accepts only the confirmed `50242569861` destination; any other value becomes unavailable. Separate browser journeys prove the live and unavailable states.

Integration preserved the complete 11-commit Milestone 3 history without squashing or a merge commit. From merged `main`, verification passed install, formatting, lint, typecheck, 40 unit tests, 59 default-demo Chromium tests, one explicit-live Chromium journey, one unavailable-destination Chromium journey, the static build, restored-default bundle inspection, and HTTP 200 on all five customer routes. Ten real runtime screenshots and a separate case study remain present and tracked.

The initial independent review reported three Important findings: the photo-bearing flyer still shipped through the header, live configuration could point elsewhere while displaying the confirmed number, and a stale homepage assertion broke the full browser gate. Commit `7c78b70` resolves all three with fail-first evidence and adds a deterministic artifact scroll reset. Focused re-review found no Critical or Important issue and returned **Ready for visual approval**. Its only Minor—the plan omitted the two new handoff commands from the final gate—was corrected.

The default export visibly remains in demo mode and contains no exact active live/test destination. No public deployment was attempted. Recommended future deployment remains a static host only after separate approval, with demo mode retained unless the confirmed live handoff is intentionally enabled.

Non-blocking pre-deployment refinements are to shorten the mobile demo banner, review mobile footer density, prepare a shorter client-facing case study, and replace illustrations only when authentic product photography is approved.

## Milestone 2 approved integration — 2026-07-21

Status: **Formally approved, fast-forwarded into `main`, and verified from the merged main checkout. Public deployment remains unauthorized.**

The working candidate completed install, formatting, lint, route type generation plus TypeScript, 27 Vitest tests, 49 Chromium Playwright tests, and the Next.js static build. `npm run start` served the static export, and all five customer routes returned HTTP 200. The browser suite includes a reproducible two-item customer journey at 1440×1000 and 390×844, one focused validation state, zero captured console errors, and no horizontal overflow in the captured states. Seven real runtime screenshots were generated, visually inspected at original detail, and remained byte-identical after the final browser run.

Independent review found four Important issues: a mobile menu that persisted across client navigation, reviewed order details that could become stale before WhatsApp handoff, a date threshold that could become stale across Guatemala midnight, and evidence records that lagged the reviewed HEAD. The three behavior defects were reproduced with fail-first browser tests and fixed; this evidence synchronization resolves the fourth. No Critical finding was reported.

Independent follow-up verdict: **Ready to merge**, with no Critical or Important finding remaining. One non-blocking Minor recommends explicit feedback instead of silently clamping invalid menu quantities.

Integration preserved all 15 feature commits without squashing. From merged `main`, install, formatting, lint, typecheck, 27 unit tests, 49 Chromium tests, static build, and the five-route HTTP 200 production-preview check passed.

The verified `main` history was pushed to the private GitHub repository and local/remote SHA parity was confirmed. The clean feature worktree and fully merged local branch were then removed through the finishing workflow.

No public deployment was attempted. No Lighthouse or equivalent synthetic performance score was produced. The static build retained the known workspace-root inference warning caused by the main checkout and worktree lockfiles; Playwright retained the environment-only `NO_COLOR`/`FORCE_COLOR` warning. The earlier Milestone 1 PostCSS advisory remains open and was not re-audited in Milestone 2.

## Milestone 1 evidence (preserved)

Status: **Formally approved and merged into `main` — 2026-07-19**

This is not a public release. `milestone-1-foundation` was merged into `main` with a fast-forward-only merge, preserving all commits. The required verification passed from `main`: `npm install`, formatting, lint, typecheck, three unit tests, nine Chromium E2E tests, static build/export, and a production-preview HTTP 200 response.

The main-checkout verification exposed and resolved two portability conditions: ESLint now ignores repository-owned `.worktrees/` output with RED/GREEN regression coverage, and an empty untracked legacy `app/` directory was removed so Next.js resolves the approved `src/app/` tree. One Minor follow-up recommends guaranteed-missing-route coverage for the exported 404 main. Public deployment remains separately gated, Milestone 2 awaits explicit user approval, and the PostCSS advisory remains open.
