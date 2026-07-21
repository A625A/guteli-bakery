# Test Report

## Milestone 4 final verification — 2026-07-21

Status: **PASS on `milestone-4-brand-refinement` at code HEAD `7e33af8`; awaiting user visual approval.**

| Command or evidence               | Observed result                                                                                                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm install`                     | PASS: dependency graph already up to date.                                                                                                                                  |
| `npm run format:check`            | PASS.                                                                                                                                                                       |
| `npm run lint`                    | PASS.                                                                                                                                                                       |
| `npm run typecheck`               | PASS.                                                                                                                                                                       |
| `npm test`                        | PASS: 6 files and 40 tests.                                                                                                                                                 |
| First sandboxed Playwright launch | Environment failure before tests: `listen EPERM 127.0.0.1:3000`. Systematic debugging identified sandbox port denial; the permitted rerun exercised real browser behavior.  |
| `npm run test:e2e`                | PASS: 60/60 Chromium tests.                                                                                                                                                 |
| `npm run test:e2e:live`           | PASS: 1/1 confirms the approved destination.                                                                                                                                |
| `npm run test:e2e:unavailable`    | PASS: 1/1 proves an unapproved destination fails closed.                                                                                                                    |
| `npm run build`                   | PASS: `/`, `/_not-found`, `/cart`, `/contact`, `/menu`, and `/order` statically generated.                                                                                  |
| `npm run start`                   | PASS: `/`, `/menu/`, `/cart/`, `/order/`, and `/contact/` each returned HTTP 200; server stopped cleanly.                                                                   |
| Default export safety             | PASS: exact slogan and banner present; no active `href="https://wa.me/"`, unapproved test destination, flyer reference, removed `.home-hero__wordmark`, or removed caption. |
| Artifact integrity                | PASS: 14 tracked Milestone 4 PNGs; required six inspected at original resolution; all ten Milestone 3 PNG hashes preserved.                                                 |

Review RED/GREEN: the initial whole-branch review found one Important unofficial code-rendered hero wordmark. A fail-first contract required `.home-hero__wordmark` to be absent, then commit `7e33af8` replaced it with the neutral `Selección ilustrada` label and refreshed only the two homepage images. Follow-up review found no Critical, Important, or Minor finding and returned **Ready for visual approval**.

## Milestone 3 verification — 2026-07-21

Status: **PASS on `milestone-3-portfolio-polish`; visual approval and integration remain pending.**

| Command or evidence                         | Observed result                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Review RED/GREEN: destination authorization | RED: a syntactically valid but unapproved `50255555555` destination incorrectly resolved to live mode. GREEN: only the confirmed `50242569861` destination resolves live; 13 focused resolver cases pass.                                                                                                                |
| Review RED/GREEN: flyer bundle              | RED: the homepage still rendered an image sourced from `guteli-brand-reference`. GREEN: the header is code-rendered, the focused browser contract passes, and the final static export contains no flyer reference.                                                                                                       |
| Review regression: stale homepage assertion | The obsolete expectation for “Logotipo original de Güteli Bakery” was replaced with the graphic-only contract; the formerly failing full-suite case now passes.                                                                                                                                                          |
| Artifact-harness debugging                  | The first post-review full run reached 57 passes before a screenshot helper retained a 56px smooth-scroll offset; its dependent mobile case did not run. Holding an inline `scroll-behavior: auto !important` through capture fixed the race. The focused artifact suite then passed 2/2, and the complete suite passed. |
| `npm install`                               | PASS: 458 locked packages installed in the isolated worktree.                                                                                                                                                                                                                                                            |
| `npm run format` / `npm run format:check`   | PASS: Prettier normalized the changed files; the final check reports all matched files formatted.                                                                                                                                                                                                                        |
| `npm run lint`                              | PASS: ESLint exits 0 with `--max-warnings=0`.                                                                                                                                                                                                                                                                            |
| `npm run typecheck`                         | PASS: `next typegen` and `tsc --noEmit` complete successfully.                                                                                                                                                                                                                                                           |
| `npm test`                                  | PASS: 6 Vitest files and 40 tests pass.                                                                                                                                                                                                                                                                                  |
| `npm run test:e2e`                          | PASS: all 59 default-demo Chromium tests pass in the final complete run, including both artifact journeys.                                                                                                                                                                                                               |
| `npm run test:e2e:live`                     | PASS: 1 Chromium journey verifies the confirmed `50242569861` order/contact/footer destination and matching displayed identity.                                                                                                                                                                                          |
| `npm run test:e2e:unavailable`              | PASS: 1 Chromium journey verifies an unapproved destination renders no `wa.me` link and retains copy fallback.                                                                                                                                                                                                           |
| Static builds                               | PASS: default-demo, explicit-live, and restored default-demo builds all statically prerender the six expected routes.                                                                                                                                                                                                    |
| Local preview                               | PASS: the restored default export returned HTTP 200 for all five customer routes.                                                                                                                                                                                                                                        |
| Visual evidence                             | PASS: 10 non-empty PNGs have the documented 1440px or 390px widths and were recaptured by the running app.                                                                                                                                                                                                               |

Observed non-blocking warnings: Playwright reported the environment-only `NO_COLOR`/`FORCE_COLOR` warning; Next.js reported workspace-root inference from the two lockfiles and recommended `data-scroll-behavior="smooth"` for route transitions. Reduced-motion behavior is already covered and passes. No fresh dependency audit or Lighthouse run was performed.

## Milestone 2 verification — 2026-07-21

Status: **PASS on `milestone-2-working-mvp`.**

| Command                               | Observed result                                                                                                                                                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First sandboxed artifact run          | Environment failure before tests: the restricted sandbox could not bind `127.0.0.1:3000` (`listen EPERM`). The unchanged command was rerun with local-server permission.                                              |
| First permission-enabled artifact run | 1 passed, 1 failed. The mobile helper queried a cart link while its parent `<details>` was closed. The helper was corrected before evidence was accepted.                                                             |
| Focused artifact GREEN                | `npx playwright test tests/browser/artifacts.spec.ts` passed 2 tests and wrote all seven approved PNGs.                                                                                                               |
| Review-fix RED/GREEN                  | Expected failures reproduced pre-hydration cart loss, persistent mobile navigation, stale reviewed handoff data, and a stale Guatemala-midnight date threshold; each focused regression passed after its minimal fix. |
| `npm install`                         | PASS: the locked dependency graph was already up to date.                                                                                                                                                             |
| `npm run format`                      | PASS: Prettier completed with no final file changes required.                                                                                                                                                         |
| `npm run format:check`                | PASS: all matched files use Prettier style.                                                                                                                                                                           |
| `npm run lint`                        | PASS: ESLint exited 0 with `--max-warnings=0`.                                                                                                                                                                        |
| `npm run typecheck`                   | PASS: `next typegen` generated route types and `tsc --noEmit` exited 0.                                                                                                                                               |
| `npm test`                            | PASS: 5 Vitest files and 27 tests passed.                                                                                                                                                                             |
| `npm run test:e2e`                    | PASS: 49 Chromium tests passed in the final 27.1s run, including both artifact-capture cases and the review-fix regressions.                                                                                          |
| `npm run build`                       | PASS: Next.js compiled and statically prerendered `/`, `/_not-found`, `/cart`, `/contact`, `/menu`, and `/order`.                                                                                                     |
| Artifact integrity                    | PASS: 7/7 expected files exist and are non-empty; desktop/validation PNGs are 1440px wide and mobile PNGs are 390px wide. SHA-256 hashes were unchanged after the full browser suite recaptured them.                 |
| Local preview                         | PASS: `npm run start` served `out/`; HEAD requests to `/`, `/menu/`, `/cart/`, `/order/`, and `/contact/` each returned HTTP 200 before the server stopped cleanly.                                                   |

Tested artifact routes and states: homepage `/`; menu interactions on `/menu/`; two distinct cart lines and Q120 subtotal on `/cart/`; pickup form using the live input `min` date on `/order/`; one-name-field focused validation error; and the completed request summary. Exact viewports were 1440×1000 and 390×844. Screenshots used `fullPage: true` and `animations: 'disabled'`.

Observed non-blocking warnings: Playwright reported that `NO_COLOR` was ignored because `FORCE_COLOR` was set; Next.js reported workspace-root inference from the main-checkout and worktree lockfiles. Neither warning failed a gate. No Lighthouse or fresh dependency-audit command was run in Milestone 2.

## Milestone 1 evidence (preserved)

Status: **Merged-main verification PASS — 2026-07-19**

| Command                  | Result                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused Playwright RED   | Expected FAIL; 5 existing tests passed and 4 new regression tests failed: focus inactive at both viewports, footer 787/1000 desktop and 722/844 mobile. |
| Focused Playwright GREEN | PASS; all 9 tests passed after the minimal main-focus and body-grid fixes.                                                                              |
| `npm run format:check`   | PASS; all matched files use Prettier style.                                                                                                             |
| `npm run lint`           | PASS; ESLint completed with `--max-warnings=0`.                                                                                                         |
| `npm run typecheck`      | PASS; `next typegen` generated route types, then `tsc --noEmit` completed.                                                                              |
| ESLint portability RED   | Expected FAIL; `ESLint.isPathIgnored()` returned `false` for generated output under `.worktrees/`.                                                      |
| ESLint portability GREEN | PASS after adding the minimal global `.worktrees/**` ignore; the exact `npm run lint` command passed from `main`.                                       |
| `npm test`               | PASS; 2 Vitest files and 3 tests passed.                                                                                                                |
| `npm run test:e2e`       | PASS; 9 Chromium Playwright tests passed.                                                                                                               |
| `npm run build`          | PASS; static export generated the five in-scope routes and `/_not-found`.                                                                               |
| Local preview            | PASS; `npm run start` served `out/` and `HEAD /` returned HTTP 200.                                                                                     |

The browser suite first encountered `listen EPERM` inside the restricted sandbox; the root cause was loopback-port permission, and the unchanged command passed under approved local-server escalation. The `NO_COLOR`/`FORCE_COLOR` messages were environment warnings, not test failures.

Milestone 1 is formally approved and merged into `main`. The required commands passed from the main checkout after the worktree-lint portability fix and removal of the empty legacy root `app/` directory. One Minor follow-up recommends guaranteed-missing-route regression coverage for the exported 404 main at the next test update. The PostCSS advisory remains open.

Fresh-checkout review: with both ignored `.next` and `tsconfig.tsbuildinfo` absent, the pre-fix `tsc --noEmit` command unexpectedly exited 0 rather than reproducing the predicted missing-route-types failure. Next.js 16.2.10 was verified to support `next typegen`; the portable script now runs `next typegen && tsc --noEmit`, and clean-start verification generated the route types successfully before TypeScript ran.
