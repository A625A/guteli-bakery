# Test Report

## Milestone 2 verification — 2026-07-21

Status: **PASS on `milestone-2-working-mvp`.**

| Command                               | Observed result                                                                                                                                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First sandboxed artifact run          | Environment failure before tests: the restricted sandbox could not bind `127.0.0.1:3000` (`listen EPERM`). The unchanged command was rerun with local-server permission.                              |
| First permission-enabled artifact run | 1 passed, 1 failed. The mobile helper queried a cart link while its parent `<details>` was closed, so the link was absent from Playwright's accessible tree. No product defect was indicated.         |
| Focused artifact GREEN                | `npx playwright test tests/browser/artifacts.spec.ts` passed 2 tests in the final capture run and wrote all seven approved PNGs.                                                                      |
| `npm run format:check`                | PASS: all matched files use Prettier style.                                                                                                                                                           |
| `npm run lint`                        | PASS: ESLint exited 0 with `--max-warnings=0`.                                                                                                                                                        |
| `npm run typecheck`                   | PASS: `next typegen` generated route types and `tsc --noEmit` exited 0.                                                                                                                               |
| `npm test`                            | PASS: 5 Vitest files and 22 tests passed.                                                                                                                                                             |
| `npm run test:e2e`                    | PASS: 45 Chromium tests passed in the final 22.6s run, including the two artifact-capture cases.                                                                                                      |
| `npm run build`                       | PASS: Next.js compiled and statically prerendered `/`, `/_not-found`, `/cart`, `/contact`, `/menu`, and `/order`.                                                                                     |
| Artifact integrity                    | PASS: 7/7 expected files exist and are non-empty; desktop/validation PNGs are 1440px wide and mobile PNGs are 390px wide. SHA-256 hashes were unchanged after the full browser suite recaptured them. |
| Local preview                         | PASS: `curl -sS -I http://127.0.0.1:3000/` returned HTTP 200.                                                                                                                                         |

Tested artifact routes and states: homepage `/`; menu interactions on `/menu/`; two distinct cart lines and Q120 subtotal on `/cart/`; pickup form using the live input `min` date on `/order/`; one-name-field focused validation error; and the completed request summary. Exact viewports were 1440×1000 and 390×844. Screenshots used `fullPage: true` and `animations: 'disabled'`.

Observed non-blocking warnings: Playwright reported that `NO_COLOR` was ignored because `FORCE_COLOR` was set; Next.js build reported workspace-root inference from duplicate checkout/worktree lockfiles. Neither warning failed a gate. No Lighthouse or dependency-audit command was run in Task 8.

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
