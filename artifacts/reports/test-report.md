# Test Report

Status: **PASS — 2026-07-19**

| Command                | Result                                                |
| ---------------------- | ----------------------------------------------------- |
| `npm run format`       | PASS; scoped Prettier write completed.                |
| `npm run format:check` | PASS; all matched files use Prettier style.           |
| `npm run lint`         | PASS; ESLint completed with `--max-warnings=0`.       |
| `npm run typecheck`    | PASS; `tsc --noEmit` completed.                       |
| `npm test`             | PASS; 1 Vitest file and 2 tests passed.               |
| `npm run test:e2e`     | PASS; 5 Chromium Playwright route-shell tests passed. |

The browser suite first encountered `listen EPERM` inside the restricted sandbox; the root cause was loopback-port permission, and the same command passed under approved local-server escalation. The `NO_COLOR`/`FORCE_COLOR` messages were environment warnings, not test failures.
