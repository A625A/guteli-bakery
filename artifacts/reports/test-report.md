# Test Report

Status: **PASS — 2026-07-19**

| Command                | Result                                                                     |
| ---------------------- | -------------------------------------------------------------------------- |
| `npm run format`       | PASS; scoped Prettier write completed.                                     |
| `npm run format:check` | PASS; all matched files use Prettier style.                                |
| `npm run lint`         | PASS; ESLint completed with `--max-warnings=0`.                            |
| `npm run typecheck`    | PASS; `next typegen` generated route types, then `tsc --noEmit` completed. |
| `npm test`             | PASS; 1 Vitest file and 2 tests passed.                                    |
| `npm run test:e2e`     | PASS; 5 Chromium Playwright route-shell tests passed.                      |

The browser suite first encountered `listen EPERM` inside the restricted sandbox; the root cause was loopback-port permission, and the same command passed under approved local-server escalation. The `NO_COLOR`/`FORCE_COLOR` messages were environment warnings, not test failures.

Fresh-checkout review: with both ignored `.next` and `tsconfig.tsbuildinfo` absent, the pre-fix `tsc --noEmit` command unexpectedly exited 0 rather than reproducing the predicted missing-route-types failure. Next.js 16.2.10 was verified to support `next typegen`; the portable script now runs `next typegen && tsc --noEmit`, and clean-start verification generated the route types successfully before TypeScript ran.
