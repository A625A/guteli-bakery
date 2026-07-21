# Release Summary

## Milestone 4 completed visual candidate — 2026-07-21

Status: **Completed candidate awaiting user visual approval. Not merged, tagged, pushed, or deployed.**

Milestone 4 anchors the interface in the supplied original logo, adds the exact approved slogan `Buenos momentos empiezan con algo recién horneado.`, reduces mobile demo/footer density, and introduces restrained Canasta vocabulary, category labels, basket motifs, and warmer feedback without changing the approved static order-request architecture or handoff rules.

Logo provenance is explicit: `assets/reference/guteli-brand-reference.jpeg` is the canonical 1131×1600 progressive JPEG at SHA-256 `4af05f831029c5d07f835c9cea51d510956f5e5beaa5e46bc1e30bf7b0a1d194`. `public/brand/guteli-logo-original.jpeg` is the lossless `864x240+160+48` crop containing only the original GÜTELI BAKERY wordmark, pretzel-heart symbol, original colors, and surrounding dark field. It contains no product photography, menu copy, phone number, or slogan and was not redrawn, traced, recolored, sharpened, simplified, or distorted.

The fresh final gate passed dependency install, format check, lint, typecheck, 40 unit tests, 60 default Chromium tests, one confirmed-live test, one fail-closed unavailable test, static export of all six routes, five-route HTTP 200 preview, default-export safety inspection, and screenshot integrity. The first sandboxed Playwright launch failed before tests with `listen EPERM 127.0.0.1:3000`; the permitted rerun exercised the real browser suite and passed.

Default demo mode displays exactly `Sitio demo — ninguna solicitud se envía.` and renders no active `href="https://wa.me/"`. The exported HTML contains no unapproved test destination, flyer reference, removed `.home-hero__wordmark`, or removed caption. The confirmed phone/destination may exist as public configuration but produces no active demo link.

Fourteen tracked Milestone 4 PNGs provide desktop, mobile, logo, banner, footer, validation, summary, cart, menu, and demo-handoff evidence. The required six were inspected at original resolution with no overflow, clipping, logo distortion, or product photography. All ten Milestone 3 PNG hashes remain preserved.

Initial whole-branch review found one Important unofficial hero wordmark. Commit `7e33af8` fixed it with fail-first coverage and refreshed the two homepage images. Follow-up review found no Critical, Important, or Minor finding and returned **Ready for visual approval**. Explicit approval is required before any integration or publication action.

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
