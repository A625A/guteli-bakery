# Test Report

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
