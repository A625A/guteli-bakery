# Task 4 Repository Evidence Report

Date: 2026-07-19

## Scope

This report covers repository-only Task 4 work in `milestone-1-foundation`. External Obsidian-vault updates were deliberately not performed and remain for the next bounded subtask.

## Evidence

- `npm run format` and `npm run format:check`: PASS.
- `npm run lint`: PASS with `--max-warnings=0`.
- `npm run typecheck`: PASS.
- `npm test`: PASS; 1 file and 2 tests passed.
- `npm run test:e2e`: PASS; 5 Chromium browser tests passed. The restricted sandbox initially denied the loopback listen with `EPERM`; after confirming that root cause, the same command passed under approved local-server escalation.
- `npm run build`: PASS; Next.js exported `/`, `/_not-found`, `/cart`, `/contact`, `/menu`, and `/order` to `out/`.
- `npm run start`: PASS; the static `out/` directory served locally at `http://127.0.0.1:3000`.
- Direct production Playwright: PASS; all five routes at 1440×1000 and 390×844 returned successfully with zero console errors and no horizontal overflow (10 route/viewport checks).
- Keyboard: PASS; Tab visibly focused `Saltar al contenido`; Enter navigated to the existing `#main-content` target.
- Screenshots: visually inspected and confirmed valid PNGs: desktop 1440×1000 and mobile 390×844.

## Tooling fallback

The in-app Browser was already verified unavailable and was not retried. Direct Playwright against the local production server was used instead. A direct Chromium launch initially hit a macOS Mach-port sandbox denial; the root cause was sandbox permission rather than application behavior, and the approved escalated direct Playwright run passed.

## Documentation

README, AI-EOS task/capability records, artifact index, preview information, build/test/accessibility/performance/visual/release reports were updated with the observed results. No Lighthouse score is claimed because no callable Lighthouse tool was available.

## Remaining work

External Obsidian-vault updates are explicitly deferred to the next bounded subtask. Task 5 retains the final verification and independent code-review gate.
